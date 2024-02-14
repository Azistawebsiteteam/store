const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

//  id,
//    vendor,
//    product_category,
//    type,
//    tags,
//    published,
//    option1,
//    option2,
//    option3,
//    variant_sku,
//    variant_grams,
//    variant_inventory_tracker,
//    variant_inventory_policy,
//    variant_fulfillment_service,
//    variant_price,
//    variant_compare_at_price,
//    variant_requires_shipping,
//    variant_taxable,
//    variant_barcode,
//    image_src,
//    image_position,
//    image_alt_text,
//    gift_card,
//    seo_title,
//    seo_description,
//    variant_image,
//    variant_weight_unit,
//    variant_HS_code,
//    cost_per_item,
//    price_india,
//    status;

exports.getProducts = catchAsync(async (req, res, next) => {
  const productquery = '';
  db.query(productquery, (err, products) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
  });
});

// azst_brands_id: brand.azst_brands_id,
//   azst_brand_name: brand.azst_brand_name,
//   azst_brand_logo: `${req.protocol}://${req.get('host')}/brand/logs/${
//     brand.azst_brand_logo
//   }`,

const modifyProductData = (req, product) => ({
  id: 9,
  type: 'food',
  tags: 'taste good',
  variant_price: 2000,
  variant_compare_at_price: '1000',
  image_src: '1707888023094-Back 1.png',
  image_position: 'potriate',
  image_alt_text: 'taste good',
  variant_image: '1707888023131-Front 1.png',
  cost_per_item: '500',
  price_india: 300,
});

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT 
  type,
  tags,
  variant_price,
  variant_compare_at_price,
  image_src,
  image_position: 'potriate',
  image_alt_text: 'taste good',
  variant_image: '1707888023131-Front 1.png',
  cost_per_item: '500',
  price_india: 300, FROM azst_products
                        JOIN azst_sku_variant_info on azst_products.id = azst_sku_variant_info.product_id
                         WHERE product_category ->> '$[*]' LIKE CONCAT('%', ?, '%')  AND status = 1`;

  db.query(getProducts, [collectionId], (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));

    // const products = results.map((product) => modifyProductData(req, product));
    res.status(200).send(results);
  });
});
