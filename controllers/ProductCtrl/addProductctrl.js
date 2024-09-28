const multer = require('multer');
const sharp = require('sharp');
const db = require('../../Database/dbconfig');
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
    .toFormat('png')
    .png({ quality: 100 }) // Note: PNG does not support quality setting like JPEG
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
    productMainTitle,
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
    minCartQty = 1,
    maxCartQty = 10,
  } = req.body;

  // Parse variants if available
  const parsedVariants = variantsThere ? JSON.parse(variants) : [];
  let comparePrice = productComparePrice;
  let price = productPrice;

  // If there are variants, update the price and compare price
  if (parsedVariants.length > 0) {
    price = getPricess(parsedVariants, 'offer_price');
    comparePrice = getPricess(parsedVariants, 'comparePrice');
  }

  console.log({ price, comparePrice });

  const urlTitle = productTitle.replace(/ /g, '-');
  const productImage = productImages[0];

  const productQuery = `INSERT INTO azst_products (product_main_title,
                            product_title, product_info, vendor_id, product_category, type, tags, collections, image_src,
                            product_images, variant_store_order, image_alt_text, seo_title, seo_description, cost_per_item,
                            price, compare_at_price, sku_code, sku_bar_code, is_taxable, product_weight, out_of_stock_sale,
                            url_handle, status, azst_updatedby, origin_country, product_url_title, is_varaints_aval,brand_id,
                            min_cart_quantity ,max_cart_quantity )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?, ?, ?)`;

  const collectionsArry = collections.map((id) => parseInt(id, 10));

  const values = [
    productMainTitle,
    productTitle,
    productInfo,
    vendor,
    category,
    productType,
    tags,
    `[${collectionsArry}]`,
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
    minCartQty ?? 1,
    maxCartQty ?? 10,
  ];

  const product = await db(productQuery, values);

  if (!variantsThere) {
    const inventory = JSON.parse(inventoryInfo);
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

        const effectiveComparePrice = Math.max(
          parseInt(comparePrice),
          parseInt(offer_price)
        );
        const offerPercentage = getofferPercentage(
          effectiveComparePrice,
          offer_price
        );

        const values = [
          productId,
          JSON.stringify([variantImage, mainVariant.variantImage]),
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

      const effectiveComparePrice = Math.max(
        parseInt(comparePrice),
        parseInt(offer_price)
      );

      const offerPercentage = getofferPercentage(
        effectiveComparePrice,
        offer_price
      );

      const values = [
        productId,
        JSON.stringify([variantImage]),
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
        value,
        null,
        null,
      ];

      await insertVariant(values, quantity);
    }
  }
  res.status(200).json({ message: 'Product & variants inserted successfully' });
});

exports.uploadInfoImgs = upload.fields([
  { name: 'ingImages', maxCount: 10 },
  { name: 'feaImages', maxCount: 10 },
]);

exports.storeIngImages = catchAsync(async (req, res, next) => {
  const { ingredients, features } = req.body;
  const parsedIngredients = JSON.parse(ingredients);
  const parsedFeatures = JSON.parse(features);
  const ingImages = req.files.ingImages || [];
  const feaImages = req.files.feaImages || [];

  if (!parsedIngredients.length && !parsedFeatures.length) {
    return next(new AppError('Ingredients and Features are Required', 400));
  }

  const updateImageData = async (data, images, folder) => {
    const updatedData = [];
    let imageIndex = 0;
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let image = item.image;

      if (typeof image === 'object') {
        // If image is an object, upload new image and get filename

        const fileName = await getVariantImgName(images[imageIndex], folder);
        imageIndex++;
        updatedData.push({ ...item, image: fileName });
      } else if (typeof image === 'string' && image !== '') {
        // If image is a string, just keep the existing filename
        updatedData.push(item);
      } else {
        return next(new AppError('Image is required for each item', 400));
      }
    }
    return updatedData;
  };

  req.body.ingredients = await updateImageData(
    parsedIngredients,
    ingImages,
    'ingredientsImages'
  );
  req.body.features = await updateImageData(
    parsedFeatures,
    feaImages,
    'featuresImages'
  );

  next();
});

exports.addInfo = catchAsync(async (req, res, next) => {
  const { ingredients, features, productId, deleteIngredient, deleteFeatures } =
    req.body;
  const empId = req.empId;

  const deleteData = async (query, data) => {
    for (let item of data) {
      await db(query, [empId, item]);
    }
  };

  const insertData = async (insertQuery, updateQuery, data) => {
    for (const item of data) {
      let query = '';
      let values = [];

      if (typeof item.id === 'number') {
        // Update existing item

        const { id, title, description, image } = item;
        const modifiedImg = image.substring(image.lastIndexOf('/') + 1);
        values = [title, modifiedImg, empId, id];
        if (description) {
          values.unshift(description);
        }
        query = updateQuery;
      } else {
        // Insert new item

        const { title, description, image } = item;
        values = [title, image, productId, empId];
        if (description) {
          values.unshift(description);
        }
        query = insertQuery;
      }

      const result = await db(query, values);
      if (result.affectedRows === 0) {
        throw new AppError('Oops! Something went wrong', 400);
      }
    }
  };

  const ingredientQuery = `INSERT INTO azst_product_ingredients (description, title, image, product_id, created_by) VALUES(?,?,?,?,?)`;
  const featureQuery = `INSERT INTO azst_product_features (title, image, product_id, created_by) VALUES(?,?,?,?)`;

  const ingredientUpQuery = `UPDATE azst_product_ingredients SET description = ?, title = ?, image = ?, updated_by = ? WHERE id = ?`;
  const featureUpQuery = `UPDATE azst_product_features SET title = ?, image = ?, updated_by = ? WHERE id = ?`;

  const deleteIngredientQ = `UPDATE azst_product_ingredients SET status = 0, updated_by = ? WHERE id = ?`;
  const deleteFeatureQ = `UPDATE azst_product_features SET status = 0, updated_by = ? WHERE id = ?`;

  await insertData(ingredientQuery, ingredientUpQuery, ingredients);
  await insertData(featureQuery, featureUpQuery, features);
  if (deleteIngredient && deleteIngredient.length) {
    await deleteData(deleteIngredientQ, deleteIngredient);
  }
  if (deleteFeatures && deleteFeatures.length) {
    await deleteData(deleteFeatureQ, deleteFeatures);
  }

  res.status(200).json({ message: 'Info Added successfully' });
});

exports.getProductInfo = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const getIngredients = `
    SELECT
      id,
      title,
      description,
      CONCAT('${req.protocol}://${req.get(
    'host'
  )}/api/images/ingredients/', image) AS image
    FROM
      azst_product_ingredients
    WHERE
      product_id = ? AND status = 1`;

  const getFeatures = `
    SELECT
      id,
      title,
      CONCAT('${req.protocol}://${req.get(
    'host'
  )}/api/images/features/', image) AS image
    FROM
      azst_product_features
    WHERE
      product_id = ? AND status = 1`;

  const [ingredients, features] = await Promise.all([
    db(getIngredients, [productId]),
    db(getFeatures, [productId]),
  ]);

  res.status(200).json({ ingredients, features });
});
