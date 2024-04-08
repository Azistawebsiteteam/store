const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

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

exports.updateVariantImage = upload.single('variantImage');

exports.isVariantExist = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;

  if (!variantId) return next(new AppError('Variant Id not provided.', 400));

  const query = `SELECT id,variant_image FROM azst_sku_variant_info WHERE id = ? AND status = 1`;

  const variantData = await db(query, [variantId]);

  if (variantData.length < 1)
    return next(new AppError('No such variant found', 404));
  req.variantData = variantData[0];
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    req.body.variantImage = '';
    return next();
  }

  const variantImg = JSON.parse(req.variantData.variant_image)[1];

  const imagePath = `uploads/variantImage/${variantImg}`;
  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;

  await sharp(req.file.buffer)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`uploads/variantImage/${imageName}`);
  req.body.variantImage = imageName;
  next();
});

const getProductImageLink = (req, i) =>
  `${req.protocol}://${req.get('host')}/product/variantimage/${i}`;

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT * FROM azst_products  WHERE id = ? AND azst_products.status = 1`;

  const getVariants = `SELECT  * FROM  azst_sku_variant_info WHERE product_id = ? AND status = 1`;

  const results = await db(getproductDetails, [productId]);

  if (results.length === 0)
    return res
      .status(200)
      .json({ productDetails: {}, message: 'No product found' });

  const product = results[0];
  const productIdd = product.id;

  const productDetails = {
    ...product,
    image_src: `${req.protocol}://${req.get('host')}/product/images/${
      product.image_src
    }`,
    product_images: JSON.parse(product.product_images).map(
      (product_image) =>
        `${req.protocol}://${req.get('host')}/product/images/${product_image}`
    ),
  };

  const storeOrder = JSON.parse(product.variant_store_order);

  const result = await db(getVariants, [productIdd]);
  const variantsData = [];
  storeOrder.forEach((element) => {
    variantsData.push({ UOM: element, values: [] });
  });

  // Push unique values from result into variantsData
  result.forEach((variant) => {
    for (let i = 0; i < variantsData.length; i++) {
      variantsData[i].values.push(variant[`option${i + 1}`]);
    }
  });

  // Remove duplicate values using set
  variantsData.forEach((variant) => {
    variant.values = Array.from(new Set(variant.values));
    variant.values = variant.values.filter((value) => value !== null);
  });

  const avalaibleVariants = result.map((variant) => ({
    ...variant,
    variant_image: JSON.parse(variant.variant_image).map((i) =>
      getProductImageLink(req, i)
    ),
  }));

  res.status(200).json({
    productDetails,
    variants: variantsData,
    avalaibleVariants,
    message: 'Data retrieved successfully.',
  });
});

exports.variantUpdate = catchAsync(async (req, res, next) => {
  const {
    variantId,
    variantWeight,
    variantWeightUnit,
    amount,
    offerPrice,
    quantity,
    shCode,
    barCode,
    skuCode,
    isTaxable,
    shippingRequired,
    inventoryId,
    inventoryPolicy,
    variantService,
    variantImage,
  } = req.body;

  const offerPercentage = Math.round(
    ((parseInt(amount) - parseInt(offerPrice || 0)) / parseInt(amount)) * 100,
    0
  );

  let variantImgQuery = 'variant_image =? ,';

  const variantImg = JSON.parse(req.variantData.variant_image)[0];
  const variantImages = JSON.stringify([variantImg, variantImage]);

  const values = [
    variantImages,
    variantWeightUnit,
    shCode,
    barCode,
    skuCode,
    variantWeight,
    inventoryId,
    inventoryPolicy,
    variantService,
    shippingRequired,
    isTaxable,
    amount,
    offerPrice,
    offerPercentage,
    quantity,
    variantId,
  ];

  if (variantImage === '') {
    variantImgQuery = '';
    values.shift();
  }

  const query = `UPDATE azst_sku_variant_info 
                 SET ${variantImgQuery} variant_weight_unit =?, variant_HS_code =?, variant_barcode =?,
                  variant_sku =?, variant_weight=?, variant_inventory_tracker=?, variant_inventory_policy=?,
                  variant_fulfillment_service=?, variant_requires_shipping=?, variant_taxable=?,
                  actual_price=?, offer_price=?, offer_percentage=?, variant_quantity=?
                 WHERE id = ? `;
  await db(query, values);

  res.status(200).json({ message: 'Variant data updated successfully' });
});

exports.deleteVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;
  const query = `Update azst_sku_variant_info SET status = 0 WHERE id = ?`;
  await db(query, [variantId]);
  res.status(200).json({ message: 'Variant data Deleted successfully' });
});
