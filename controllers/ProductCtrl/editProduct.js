const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');

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

exports.getProductVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.query;
  const query = `SELECT * FROM azst_sku_variant_info WHERE id = ? AND status = 1`;
  const variantData = await db(query, [variantId]);

  if (variantData.length < 1) {
    res.status(404).send({
      variant: {},
      message: 'No such variant found',
    });
    return;
  }
  const getImageLink = (img) =>
    `${req.protocol}://${req.get('host')}/product/variantimage/${img}`;

  const variantObj = variantData[0];

  const variant_data = {
    ...variantObj,
    variant_image: JSON.parse(variantObj.variant_image).map((img) =>
      getImageLink(img)
    ),
  };

  res.status(200).json({ variant: variant_data, message: 'Variant Details' });
});
