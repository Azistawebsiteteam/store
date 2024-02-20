const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT id as product_id, display_name, short_name, product_name, vendor_id, 
                        type, tags, DATE_FORMAT(published, '%d-%m-%Y') AS published_date, image_src,image_position,
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

  const getproductDetails = `SELECT 
            azst_products.display_name,
            azst_products.short_name,
            azst_products.product_name,
            azst_products.type,
            azst_products.tags,
            azst_products.product_images,
            azst_product_details.product_id,
            azst_product_details.product_description,
            azst_product_details.product_highlights,
            azst_product_details.product_ingredients,
            azst_product_details.product_benefits,
            azst_product_details.product_how_to_use,
            azst_product_details.product_specifications,
            azst_vendor_details.azst_vendor_name
          FROM azst_products
            JOIN azst_product_details ON azst_products.id = azst_product_details.product_id
            JOIN azst_vendor_details ON azst_products.vendor_id = azst_vendor_details.azst_vendor_id
          WHERE azst_products.id = ? AND azst_products.status = 1`;

  const getVariants = `SELECT azst_sku_variant_info.id as varient_id,variant_image, variant_weight_unit, 
                       variant_HS_code, variant_barcode, variant_sku, variant_grams, variant_inventory_tracker,
                       variant_inventory_policy, variant_fulfillment_service, variant_requires_shipping,
                       variant_taxable, color, size, actual_price, offer_price, offer_percentage
                      FROM  azst_sku_variant_info WHERE product_id = ? AND status = 1`;

  db.query(getproductDetails, [productId], (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    if (results.length === 0)
      return res
        .status(200)
        .json({ productDetails: {}, message: 'No product found' });

    const product = results[0];

    const productDetails = {
      ...product,
      product_images: JSON.parse(product.product_images).map(
        (product_image) =>
          `${req.protocol}://${req.get('host')}/product/images/${product_image}`
      ),
    };

    db.query(getVariants, [productId], (err, result) => {
      if (err) return next(new AppError(err.sqlMessage, 400));

      const variants = result.map((variant) => ({
        ...variant,
        variant_image: `${req.protocol}://${req.get(
          'host'
        )}/product/variantimage/${variant.variant_image}`,
        variant_barcode: `${req.protocol}://${req.get(
          'host'
        )}/variant/barcode/image/${variant.variant_barcode}`,
      }));
      res.status(200).json({
        productDetails,
        variants,
        message: 'Data retrieved successfully.',
      });
    });
  });
});
