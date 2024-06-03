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
    cb(new Error('File is not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.fields([
  { name: 'productImages', maxCount: 20 },
  { name: 'variantImage', maxCount: 100 }, // Assuming you want to allow multiple images
]);

const getvariantImgName = async (file, folderName) => {
  const fileName = `${Date.now()}-${file.originalname.replace(/ /g, '-')}`;
  await sharp(file.buffer)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`uploads/${folderName}/${fileName}`);
  return fileName;
};

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length <= 0) {
    return next(new AppError('Upload Product Images'));
  }
  for (const fieldName in req.files) {
    if (fieldName === 'productImages') {
      req.body.productImages = req.body.productImages ?? [];
      await Promise.all(
        req.files.productImages.map(async (file, i) => {
          const fileName = await getvariantImgName(file, 'productImages');
          req.body.productImages.push(fileName);
        })
      );
    } else if (fieldName === 'variantImage') {
      if (!req.body.variantsThere) {
        return;
      }

      const variants = JSON.parse(req.body.variants);
      const variantImgs = req.files.variantImage;
      let index = 0;
      const updateVariants = [];
      for (const variant of variants) {
        let mainImg = '';
        let updatedMain = { ...variant.main };

        if (
          typeof variant.main.variantImage === 'object' &&
          Object.keys(variant.main.variantImage).length === 0
        ) {
          const fi = variantImgs[index];
          index++;
          const iname = await getvariantImgName(fi, 'variantImage');

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
              const fi = variantImgs[index];
              const iname = await getvariantImgName(fi, 'variantImage');
              updatedSubv.variantImage = iname;
              index++; // Increment index after processing each subvariant
            } else {
              //if (subv.variantImage === '')
              updatedSubv.variantImage = mainImg;
            }
            return updatedSubv;
          })
        );

        updateVariants.push({
          ...variant,
          main: updatedMain,
          sub: updatedSub,
        });
      }
      req.body.variants = JSON.stringify(await Promise.all(updateVariants));
    }
  }
  next();
});

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
  } = req.body;

  const price = variantsThere
    ? getPricess(JSON.parse(variants)[0]).offer_price
    : productPrice;
  const comparePrice = variantsThere
    ? getPricess(JSON.parse(variants)[0]).comparePrice
    : productComparePrice;

  const url_title = productTitle.replace(/ /g, '-');

  const productImage = productImages[0];

  let inventory = { coc: null, coh: null, inventoryIds: [] };
  if (!variantsThere) {
    inventory = JSON.parse(inventoryInfo);
  }

  const productquery = `INSERT INTO azst_products (product_title, product_info, vendor_id,
                         product_category, type, tags, collections, image_src,
                         product_images, variant_store_order, image_alt_text, seo_title,
                         seo_description, cost_per_item, price, compare_at_price,
                         inventory_id, sku_code, sku_bar_code, is_taxable, product_weight,
                         out_of_stock_sale, url_handle, status, azst_updatedby, origin_country,
                         product_url_title,chintal_quantity,corporate_office_quantity,is_variants_aval)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)`;
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
    JSON.stringify(inventory.inventoryIds),
    skuCode,
    skuBarcode,
    productIsTaxable,
    productWeight,
    cwos,
    urlHandle,
    productActiveStatus,
    req.empId,
    originCountry,
    url_title,
    inventory.coc,
    inventory.coh,
    variantsThere,
  ];

  const product = await db(productquery, values);

  if (!variantsThere) {
    res.status(200).json({
      produtId: product.insertId,
      message: 'Product added successfully',
    });
    return;
  } else {
    req.productId = product.insertId;
    next();
  }
});

exports.skuvarientsProduct = catchAsync(async (req, res, next) => {
  const { productId, body } = req;
  const { productActiveStatus, variants } = body;

  const insert_product_varients = `INSERT INTO azst_sku_variant_info (product_id,
    variant_image,
    variant_weight_unit,
    variant_HS_code,
    variant_barcode,
    variant_sku,
    variant_weight,
    variant_inventory_tracker,
    variant_inventory_policy,
    variant_fulfillment_service,
    variant_requires_shipping,
    variant_taxable,
    compare_at_price,
    offer_price,
    offer_percentage,
    status,
    variant_quantity,
    option1,
    option2,
    option3)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const insertVariant = async (values) => {
    await db(insert_product_varients, values);
  };

  const variantsData = JSON.parse(variants);

  for (let variant of variantsData) {
    let mainVariant = variant.main;
    let subvariants = variant.sub;

    if (subvariants.length > 0) {
      for (let subvariant of subvariants) {
        let {
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
        } = subvariant;

        const subValues = value.split('-');
        const option2 = subValues[0];
        const option3 = subValues.length > 1 ? subValues[1] : null;

        if (!comparePrice) {
          comparePrice = offer_price;
        }
        const offerPercentage = getofferPercentage(comparePrice, offer_price);

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
          comparePrice,
          offer_price,
          offerPercentage,
          productActiveStatus,
          quantity,
          mainVariant.value,
          option2,
          option3,
        ];
        await insertVariant(values);
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

      if (!comparePrice) {
        comparePrice = offer_price;
      }
      const offerPercentage = getofferPercentage(comparePrice, offer_price);

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
        comparePrice,
        offerPercentage,
        productActiveStatus,
        quantity,
        value,
        null,
        null,
      ];
      await insertVariant(values);
    }
  }
  res.status(200).json({ message: 'Product & variants inserted successfully' });
});
