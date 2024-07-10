const multer = require('multer');
const sharp = require('sharp');
const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const {
  getofferPercentage,
  getPricess,
} = require('../../Utils/offerperecentageCal');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('File is not an image! Please upload only images.', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.fields([
  { name: 'productImages', maxCount: 20 },
  { name: 'variantImage', maxCount: 100 },
]);

const getVariantImgName = async (file, folderName) => {
  const fileName = `${Date.now()}-${file.originalname.replace(/ /g, '-')}`;
  await sharp(file.buffer)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`uploads/${folderName}/${fileName}`);
  return fileName;
};

exports.storeImage = catchAsync(async (req, res, next) => {
  if (
    req.route.path === '/add-store' &&
    (!req.files || Object.keys(req.files).length === 0)
  ) {
    return next(new AppError('Upload Product Images', 400));
  }

  if (req.files.productImages) {
    req.body.productImages = req.body.productImages ?? [];
    await Promise.all(
      req.files.productImages.map(async (file) => {
        const fileName = await getVariantImgName(file, 'productImages');
        req.body.productImages.push(fileName);
      })
    );
  }

  if (req.files.variantImage && req.body.variantsThere) {
    const variants = JSON.parse(req.body.variants);
    const variantImgs = req.files.variantImage;
    let index = 0;
    const updateVariants = await Promise.all(
      variants.map(async (variant) => {
        let mainImg = '';
        let updatedMain = { ...variant.main };

        if (
          typeof variant.main.variantImage === 'object' &&
          Object.keys(variant.main.variantImage).length === 0
        ) {
          const fi = variantImgs[index++];
          const iname = await getVariantImgName(fi, 'variantImage');
          mainImg = iname;
          updatedMain.variantImage = iname;
        } else if (typeof variant.main.variantImage === 'string') {
          updatedMain.variantImage = variant.main.variantImage;
        }

        const updatedSub = await Promise.all(
          variant.sub.map(async (subv) => {
            let updatedSubv = { ...subv };
            if (
              typeof subv.variantImage === 'object' &&
              Object.keys(subv.variantImage).length === 0
            ) {
              const fi = variantImgs[index++];
              const iname = await getVariantImgName(fi, 'variantImage');
              updatedSubv.variantImage = iname;
            } else {
              updatedSubv.variantImage = mainImg;
            }
            return updatedSubv;
          })
        );

        return {
          ...variant,
          main: updatedMain,
          sub: updatedSub,
        };
      })
    );
    req.body.variants = JSON.stringify(updateVariants);
  }
  next();
});

const inventoryQuery = `INSERT INTO azst_inventory_product_mapping (azst_ipm_inventory_id, azst_ipm_product_id, 
                           azst_ipm_variant_id, azst_ipm_onhand_quantity, azst_ipm_avbl_quantity, azst_ipm_created_by) 
                           VALUES (?, ?, ?, ?, ?, ? )`;

exports.addProduct = catchAsync(async (req, res, next) => {
  const {
    productTitle,
    productInfo,
    variantsOrder,
    productPrice,
    productComparePrice,
    productIsTaxable,
    productCostPerItem,
    inventoryInfo,
    vendor,
    cwos,
    skuCode,
    skuBarcode,
    productWeight,
    originCountry,
    productActiveStatus,
    category,
    productType,
    collections,
    tags,
    metaTitle,
    metaDescription,
    urlHandle,
    productImages,
    variantsThere,
    variants,
    brand,
  } = req.body;

  const parsedVariants = variantsThere ? JSON.parse(variants) : null;
  const firstVariant = parsedVariants ? getPricess(parsedVariants[0]) : null;

  const price = firstVariant ? firstVariant.offer_price : productPrice;
  const comparePrice = firstVariant
    ? firstVariant.comparePrice
    : productComparePrice;

  const urlTitle = productTitle.replace(/ /g, '-');
  const productImage = productImages[0];
  const inventory = !variantsThere ? JSON.parse(inventoryInfo) : [];

  const productQuery = `INSERT INTO azst_products (
                            product_title, product_info, vendor_id, product_category, type, tags, collections, image_src,
                            product_images, variant_store_order, image_alt_text, seo_title, seo_description, cost_per_item,
                            price, compare_at_price, sku_code, sku_bar_code, is_taxable, product_weight, out_of_stock_sale,
                            url_handle, status, azst_updatedby, origin_country, product_url_title, is_varaints_aval,brand_id)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?)`;

  const values = [
    productTitle,
    productInfo,
    vendor,
    category,
    productType,
    tags,
    collections,
    productImage,
    JSON.stringify(productImages),
    variantsOrder,
    productImage.split('-')[1],
    metaTitle,
    metaDescription,
    productCostPerItem,
    price,
    comparePrice,
    skuCode,
    skuBarcode,
    productIsTaxable,
    productWeight,
    cwos,
    urlHandle,
    productActiveStatus,
    req.empId,
    originCountry,
    urlTitle,
    variantsThere,
    brand,
  ];

  const product = await db(productQuery, values);

  if (!variantsThere) {
    const inventoryPromises = inventory.map(({ inventoryId, qty }) => {
      const invValues = [inventoryId, product.insertId, 0, qty, qty, req.empId];
      return db(inventoryQuery, invValues);
    });

    await Promise.all(inventoryPromises);

    return res.status(200).json({
      productId: product.insertId,
      message: 'Product added successfully',
    });
  } else {
    req.productId = product.insertId;
    next();
  }
});

exports.skuVariantsProduct = catchAsync(async (req, res, next) => {
  const { productId, body } = req;
  const { productActiveStatus, variants, vInventoryInfo } = body;

  const insertVariantQuery = `INSERT INTO azst_sku_variant_info (
    product_id, variant_image, variant_weight_unit, variant_HS_code, variant_barcode,
    variant_sku, variant_weight, variant_inventory_tracker, variant_inventory_policy,
    variant_fulfillment_service, variant_requires_shipping, variant_taxable, compare_at_price,
    offer_price, offer_percentage, status, option1, option2, option3
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const insertVariant = async (values, quantity) => {
    const variant = await db(insertVariantQuery, values);

    const inventoryPromises = JSON.parse(vInventoryInfo).map((inventoryId) => {
      const invValues = [
        inventoryId,
        productId,
        variant.insertId,
        quantity,
        quantity,
        req.empId,
      ];
      return db(inventoryQuery, invValues);
    });

    await Promise.all(inventoryPromises);
  };

  const variantsData = JSON.parse(variants);

  for (const variant of variantsData) {
    const mainVariant = variant.main;
    const subVariants = variant.sub;

    if (subVariants.length > 0) {
      for (const subVariant of subVariants) {
        const {
          variantImage,
          variantWeight,
          variantWeightUnit,
          value,
          comparePrice,
          offer_price,
          quantity,
          hsCode,
          barCode,
          skuCode,
          isTaxable,
          shippingRequired,
          inventoryId,
          inventoryPolicy,
          variantService,
        } = subVariant;

        const subValues = value.split('-');
        const option2 = subValues[0];
        const option3 = subValues.length > 1 ? subValues[1] : null;

        const effectiveComparePrice = comparePrice || offer_price;
        const offerPercentage = getofferPercentage(
          effectiveComparePrice,
          offer_price
        );

        const values = [
          productId,
          JSON.stringify([mainVariant.variantImage, variantImage]),
          variantWeightUnit,
          hsCode,
          barCode,
          skuCode,
          variantWeight,
          inventoryId,
          inventoryPolicy,
          variantService,
          shippingRequired,
          isTaxable,
          effectiveComparePrice,
          offer_price,
          offerPercentage,
          productActiveStatus,
          mainVariant.value,
          option2,
          option3,
        ];

        await insertVariant(values, quantity);
      }
    } else {
      const {
        variantImage,
        variantWeight,
        variantWeightUnit,
        value,
        offer_price,
        comparePrice,
        quantity,
        hsCode,
        barCode,
        skuCode,
        isTaxable,
        shippingRequired,
        inventoryId,
        inventoryPolicy,
        variantService,
      } = mainVariant;

      const effectiveComparePrice = comparePrice || offer_price;
      const offerPercentage = getofferPercentage(
        effectiveComparePrice,
        offer_price
      );

      const values = [
        productId,
        variantImage,
        variantWeightUnit,
        hsCode,
        barCode,
        skuCode,
        variantWeight,
        inventoryId,
        inventoryPolicy,
        variantService,
        shippingRequired,
        isTaxable,
        offer_price,
        effectiveComparePrice,
        offerPercentage,
        productActiveStatus,
        value,
        null,
        null,
      ];

      await insertVariant(values, quantity);
    }
  }
  res.status(200).json({ message: 'Product & variants inserted successfully' });
});
