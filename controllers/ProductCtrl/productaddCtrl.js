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

// { name: 'productImage', maxCount: 1 },
// { name: 'variantImage', maxCount: 1 },
// { name: 'variantbarcode', maxCount: 1 },

exports.uploadImage = upload.fields([
  { name: 'productImages', maxCount: 8 }, // Assuming you want to allow multiple images
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
    displayName,
    shortName,
    productName,
    productImage,
    productImages,
    productImagePosition,
    productImageAlt,
    gitCard,
    seoTitle,
    seoDescription,
    costPerItem,
    priceInIndia,
  } = req.body;

  const productquery = `INSERT INTO azst_products (display_name, short_name, product_name, vendor_id, 
                        product_category, type, tags, published, option1, option2, option3, image_src,
                        product_images, image_position, image_alt_text, gift_card, seo_title,
                        seo_description, cost_per_item, price_india)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const values = [
    displayName,
    shortName,
    productName,
    vendorId,
    categoryId,
    productType,
    tags,
    published,
    option1,
    option2,
    option3,
    productImage,
    JSON.stringify(productImages),
    productImagePosition,
    productImageAlt,
    gitCard,
    seoTitle,
    seoDescription,
    costPerItem,
    priceInIndia,
  ];

  const product = await db(productquery, values);
  req.productDetails = { productId: product.insertId };
  next();
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

  const { productId } = req.productDetails;

  const product_details = `INSERT INTO azst_product_details (product_id,
                                  product_description,product_highlights,product_ingredients,
                                  product_benefits,product_how_to_use,product_specifications)
                                  VALUES(?,?,?,?,?,?,?)`;
  const values = [
    productId,
    productDescription,
    productHighlights,
    productIngredients,
    productBenifits,
    howToUse,
    productSpecifications,
  ];

  await db(product_details, values);
  res.status(200).json({ meassge: 'product added to store successfully ' });
});

exports.skuvarientsProduct = catchAsync(async (req, res, next) => {
  const {
    productId,
    variantImage,
    variantWeightForUnit,
    variantHsCode,
    variantbarcode,
    variantSku,
    variantGrams,
    variantInventoryTracking,
    variantInventoryPolicy,
    variantFulfilmentService,
    varientRequiresShipping,
    varitentTaxable,
    color,
    size,
    actualPrice,
    offerPrice,
    offerPercentage,
  } = req.body;

  const insert_product_varients = `INSERT INTO azst_sku_variant_info (product_id, variant_image, 
                                    variant_weight_unit, variant_HS_code, variant_barcode, variant_sku,
                                    variant_grams, variant_inventory_tracker, variant_inventory_policy,
                                    variant_fulfillment_service, variant_requires_shipping, variant_taxable,
                                    color, size, actual_price, offer_price, offer_percentage)
                                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const values = [
    productId,
    variantImage,
    variantWeightForUnit,
    variantHsCode,
    variantbarcode,
    variantSku,
    variantGrams,
    variantInventoryTracking,
    variantInventoryPolicy,
    variantFulfilmentService,
    varientRequiresShipping,
    varitentTaxable,
    color,
    size,
    actualPrice,
    offerPrice,
    offerPercentage,
  ];

  await db(insert_product_varients, values);
  res.status(200).json({ message: 'Product varients inserted successfully' });
});
