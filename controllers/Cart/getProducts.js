const Joi = require('joi');
const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const getImageName = (images) => {
  const parsedImages = JSON.parse(images);
  if (parsedImages) {
    return parsedImages[1] ? parsedImages[1] : parsedImages[0];
  } else {
    return '';
  }
};

const getCartSchema = Joi.object({
  customerId: Joi.number().optional().allow(0),
  sessionId: Joi.string().optional().allow(''),
});

const getCartData = catchAsync(async (req, res, next) => {
  const { customerId, sessionId } = req.body;

  const { error } = getCartSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const query = `SELECT 
                        azst_cart_id,
                        azst_cart_product_id,
                        azst_cart_variant_id,
                        azst_cart_quantity,
                        product_url_title,
                        min_cart_quantity,
                        max_cart_quantity,
                        variant_image,
                        azst_products.compare_at_price AS product_compare_at_price,
                        price,
                        azst_sku_variant_info.compare_at_price,
                        offer_price,
                        offer_percentage,
                        image_src,
                        is_varaints_aval,
                        COALESCE(SUM(azst_ipm_avbl_quantity), 0) AS avbl_quantity
                    FROM 
                        azst_cart_tbl
                    LEFT JOIN 
                        azst_sku_variant_info 
                        ON azst_cart_tbl.azst_cart_variant_id = azst_sku_variant_info.id
                    LEFT JOIN 
                        azst_products 
                        ON azst_cart_tbl.azst_cart_product_id = azst_products.id
                    LEFT JOIN 
                        azst_inventory_product_mapping
                        ON (azst_cart_tbl.azst_cart_product_id = azst_inventory_product_mapping.azst_ipm_product_id
                        AND azst_cart_tbl.azst_cart_variant_id = azst_inventory_product_mapping.azst_ipm_variant_id)
                    WHERE  azst_cart_status = 1   AND 
                        (azst_customer_id = ? OR azst_session_id = ?)  
                      
                    GROUP BY 
                        azst_cart_id
                    ORDER BY 
                        azst_cart_created_on DESC;
                    `;

  const result = await db(query, [customerId, sessionId]);

  const cart_products = result.map((product) => ({
    ...product,
    variant_image: `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/variantimage/${getImageName(product.variant_image)}`,
    image_src: `${req.protocol}://${req.get('host')}/api/images/product/${
      product.image_src
    }`,
  }));

  res
    .status(200)
    .json({ cart_products, message: 'Data Retrived Successfully' });
});

const removeFromCart = catchAsync(async (req, res, next) => {
  const { cartId } = req.body;
  const query =
    'Update azst_cart_tbl set azst_cart_status = 0 where azst_cart_id = ?';
  const result = await db(query, [cartId]);
  res.status(200).json({ message: 'Cart updated successfully' });
});

module.exports = { getCartData, removeFromCart };

//   azst_cart_id,
//   azst_cart_product_id,
//   azst_cart_variant_id,
//   azst_cart_quantity,
//   azst_customer_id,
//   azst_session_id,
//   azst_cart_status,
//   azst_cart_created_on,
//   azst_cart_updated_on,
//   azst_cart_collection_id;
