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

// exports.getProducts = catchAsync(async (req, res, next) => {
//   const productquery = '';
//   db.query(productquery, (err, products) => {
//     if (err) return next(new AppError(err.sqlMessage, 400));
//   });
// });

// azst_brands_id: brand.azst_brands_id,
//   azst_brand_name: brand.azst_brand_name,
//   azst_brand_logo: `${req.protocol}://${req.get('host')}/brand/logs/${
//     brand.azst_brand_logo
//   }`,

// azst_vendor_id,
//   azst_vendor_name,
//   azst_vendor_createdon,
//   azst_vendor_updatedon,
//   azst_vendor_status;

// const modifyProductData = (req, product) => ({
//   id: 9,
//   type: 'food',
//   tags: 'taste good',
//   variant_price: 2000,
//   variant_compare_at_price: '1000',
//   image_src: '1707888023094-Back 1.png',
//   image_position: 'potriate',
//   image_alt_text: 'taste good',
//   variant_image: '1707888023131-Front 1.png',
//   cost_per_item: '500',
//   price_india: 300,
// });

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT id as product_id, display_name, short_name, product_name, vendor_id, 
                        type, tags, published, image_src,image_position,
                        image_alt_text,cost_per_item, price_india, status
                       FROM azst_products
                       WHERE product_category ->> '$[*]' LIKE CONCAT('%', ?, '%')  AND azst_products.status = 1`;

  db.query(getProducts, [collectionId], (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    if (results.length === 0)
      return res
        .status(200)
        .json({ products: [], message: 'No product found' });

    const products = results.map((product) => ({
      ...product,
      image_src: `${req.protocol}://${req.get('host')}/product/thumbnail/${
        product.image_src
      }`,
    }));
    res.status(200).json({ products, message: 'Data retrieved successfully.' });
  });
});

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const productDetails = `SELECT azst_vendor_details.azst_vendor_name,azst_products.type,azst_products.tags,
                            DATE_FORMAT(azst_products.published, '%d-%m-%Y') AS published_date,
                            azst_products.variant_sku,azst_products.variant_grams,azst_products.variant_inventory_tracker,
                            azst_products.variant_inventory_policy,azst_products.variant_fulfillment_service,
                            azst_products.variant_requires_shipping,azst_products.variant_taxable,azst_products.cost_per_item,
                            azst_products.price_india,azst_sku_variant_info.product_id,azst_sku_variant_info.display_name,
                            azst_sku_variant_info.short_name,azst_sku_variant_info.product_name,azst_sku_variant_info.variant_image,
                            azst_sku_variant_info.variant_weight_unit,azst_sku_variant_info.variant_HS_code,
                            azst_sku_variant_info.variant_barcode,azst_sku_variant_info.variant_images,
                            azst_sku_variant_info.color,azst_sku_variant_info.size,azst_sku_variant_info.actual_price,
                            azst_sku_variant_info.offer_price,azst_sku_variant_info.offer_percentage,
                            azst_product_details.sku_id,azst_product_details.product_description,
                            azst_product_details.product_highlights,azst_product_details.product_ingredients,
                            azst_product_details.product_benefits,azst_product_details.product_how_to_use,
                            azst_product_details.product_specifications
                        FROM azst_products
                          JOIN azst_sku_variant_info ON azst_products.id = azst_sku_variant_info.product_id
                          JOIN azst_product_details ON azst_products.id = azst_product_details.product_id
                          JOIN azst_vendor_details ON azst_products.vendor = azst_vendor_details.azst_vendor_id
                        WHERE azst_products.id = ? AND azst_products.status = 1`;

  db.query(productDetails, [productId], (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    if (results.length === 0)
      return res
        .status(200)
        .json({ productDetails: {}, message: 'No product found' });

    const productDetails = results.map((product) => ({
      ...product,
      variant_image: `${req.protocol}://${req.get(
        'host'
      )}/product/variantimage/${product.variant_image}`,

      variant_barcode: `${req.protocol}://${req.get(
        'host'
      )}/variant/barcode/image/${product.variant_barcode}`,

      variant_images: JSON.parse(product.variant_images).map(
        (variant_image) =>
          `${req.protocol}://${req.get('host')}/product/images/${variant_image}`
      ),
    }));

    res
      .status(200)
      .json({ productDetails, message: 'Data retrieved successfully.' });
  });
});
