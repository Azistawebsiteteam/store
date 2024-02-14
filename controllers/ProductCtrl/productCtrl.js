const multer = require('multer');
const sharp = require('sharp');
const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('file is Not an Image! please upload only image', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.fields([
  { name: 'productImage', maxCount: 1 },
  { name: 'variantImage', maxCount: 1 },
  { name: 'variantbarcode', maxCount: 1 },
  { name: 'productImages', maxCount: 5 }, // Assuming you want to allow multiple images
]);

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new AppError('Upload images is required', 400));
  }

  for (const fieldName in req.files) {
    if (fieldName === 'productImages') {
      req.body.productImages = [];
      await Promise.all(
        req.files.productImages.map(async (file, i) => {
          const fileName = `${Date.now()}-${file.originalname}`;
          await sharp(file.buffer)
            .toFormat('jpeg')
            .jpeg({ quality: 100 })
            .toFile(`uploads/productImages/${fileName}`);
          req.body.productImages.push(fileName);
        })
      );
    } else {
      const imageField = req.files[fieldName][0];
      const imageName = `${Date.now()}-${imageField.originalname}`;

      // Specify the folder based on the image field name
      const folder = `uploads/${fieldName}/`; // Corrected folder path

      await sharp(imageField.buffer)
        .toFormat('jpeg')
        .jpeg({ quality: 100 })
        .toFile(`${folder}${imageName}`);

      // Update req.body with the image information as needed
      req.body[fieldName] = imageName;
    }
  }
  next();
});

exports.getProducts = catchAsync(async (req, res, next) => {
  const productquery = '';
  db.query(productquery, (err, products) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
  });
});

exports.addProduct = catchAsync(async (req, res, next) => {
  const {
    vendorId,
    categoryId,
    productType,
    tags,
    published,
    option1,
    option2,
    option3,
    variantSku,
    variantGrams,
    variantInventoryTracking,
    variantInventoryPolicy,
    variantFulfilmentService,
    varitentPrice,
    varientCompaireAtPrice,
    varientRequiresShipping,
    varitentTaxable,
    variantbarcode,
    productImage,
    productImagePosition,
    productImageAlt,
    gitCard,
    seoTitle,
    seoDescription,
    variantImage,
    variantWeightForUnit,
    variantHsCode,
    costPerItem,
    priceInIndia,
  } = req.body;

  const productquery = `INSERT INTO azst_products ( vendor,product_category,type,tags,published,
                        option1,option2,option3,variant_sku,variant_grams,variant_inventory_tracker,
                        variant_inventory_policy,variant_fulfillment_service, variant_price,variant_compare_at_price,
                        variant_requires_shipping,variant_taxable,variant_barcode,image_src,image_position,
                        image_alt_text,gift_card,seo_title,seo_description,variant_image,variant_weight_unit,
                        variant_HS_code,cost_per_item,price_india)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const values = [
    vendorId,
    categoryId,
    productType,
    tags,
    published,
    option1,
    option2,
    option3,
    variantSku,
    variantGrams,
    variantInventoryTracking,
    variantInventoryPolicy,
    variantFulfilmentService,
    varitentPrice,
    varientCompaireAtPrice,
    varientRequiresShipping,
    varitentTaxable,
    variantbarcode,
    productImage,
    productImagePosition,
    productImageAlt,
    gitCard,
    seoTitle,
    seoDescription,
    variantImage,
    variantWeightForUnit,
    variantHsCode,
    costPerItem,
    priceInIndia,
  ];

  db.query(productquery, values, (err, products) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    req.productDetails = { productId: products.insertId };
    next();
  });
});

exports.uploadProductImages = catchAsync(async (req, res, next) => {
  const { productImages } = req.body;
  const { productId } = req.productDetails;
  const insert_images = `INSERT INTO azst_product_images (images, product_id) VALUES (?,?)`;

  db.query(insert_images, [`[${productImages}]`, productId], (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    next();
  });
});

exports.skuvarientsProduct = catchAsync(async (req, res, next) => {
  const {
    displayName,
    shortName,
    productName,
    size,
    actualPrice,
    offerPrice,
    offerPercentage,
  } = req.body;

  const { productId } = req.productDetails;

  const insert_product_varients = `INSERT INTO azst_sku_variant_info (display_name,short_name,product_name,
                                      product_id,size,actual_price,offer_price,offer_percentage)
                                    VALUES(?,?,?,?,?,?,?,?)`;
  const values = [
    displayName,
    shortName,
    productName,
    productId,
    size,
    actualPrice,
    offerPrice,
    offerPercentage,
  ];

  db.query(insert_product_varients, values, (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    req.productDetails = { ...req.productDetails, skuId: result.insertId };
    next();
  });
});

exports.productDetails = catchAsync(async (req, res, next) => {
  const {
    productDescription,
    productHighlights,
    productIngredients,
    productBenifits,
    howToUse,
    productSpecifications,
  } = req.body;

  const { productId, skuId } = req.productDetails;

  const prduct_details = `INSERT INTO azst_product_details (product_id,sku_id,
                                  product_description,product_highlights,product_ingredients,
                                  product_benefits,product_how_to_use,product_specifications)
                                  VALUES(?,?,?,?,?,?,?,?)`;
  const values = [
    productId,
    skuId,
    productDescription,
    productHighlights,
    productIngredients,
    productBenifits,
    howToUse,
    productSpecifications,
  ];

  db.query(prduct_details, values, (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json({ meassge: 'product added to store successfully ' });
  });
});
