const Joi = require('joi');
const db = require('../../Database/dbconfig');

const getEstimateDates = require('../../Utils/estimateDate');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const pinocdeSchema = Joi.object({
  pincode: Joi.number().integer().min(100000).max(999999).messages({
    'number.min': 'Must be a 6-digit number',
    'number.max': 'Must be a 6-digit number',
  }),
});

exports.getEstimateDate = catchAsync(async (req, res, next) => {
  const { pincode } = req.body;

  if (!pincode) return next(new AppError('Pincode is required'));

  const { error } = pinocdeSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  const dates = await getEstimateDates(pincode);
  res.status(200).json(dates);
});

const productDetailsQuery = `JSON_ARRAYAGG(
    JSON_OBJECT(
      'azst_order_product_id', azst_ordersummary_tbl.azst_order_product_id,
      'azst_order_variant_id', azst_ordersummary_tbl.azst_order_variant_id,
      'product_title', azst_products.product_title,
      'product_image', azst_products.image_src,
      'azst_product_price', azst_ordersummary_tbl.azst_product_price,
      'option1', azst_sku_variant_info.option1,
      'option2', azst_sku_variant_info.option2,
      'option3', azst_sku_variant_info.option3,
      'azst_order_qty', azst_ordersummary_tbl.azst_order_qty
    )
  ) AS products_details`;

exports.getOrderSummary = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  const schema = Joi.object({
    orderId: Joi.string().min(1).required(),
  });

  const { error } = schema.validate({ orderId });
  if (error) return next(new AppError(error.message, 400));

  const orderQuery = `SELECT
                      azst_orders_created_on,
                      azst_orders_payment_method,
                      azst_orders_tbl.azst_orders_id as azst_order_id,
                      azst_orders_taxes,
                      azst_orderinfo_shpping_amount,
                      azst_orders_discount_amount,
                      azst_orders_total,
                      ${productDetailsQuery}                   
                    FROM azst_orders_tbl
                    LEFT JOIN azst_ordersummary_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
                    LEFT JOIN azst_orderinfo_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_orderinfo_tbl.azst_orders_id
                    LEFT JOIN azst_products
                      ON azst_ordersummary_tbl.azst_order_product_id = azst_products.id
                    LEFT JOIN azst_sku_variant_info
                      ON azst_ordersummary_tbl.azst_order_variant_id = azst_sku_variant_info.id
                    WHERE azst_orders_tbl.azst_orders_id = ?`;

  await db("SET SESSION sql_mode = ''");
  const result = await db(orderQuery, [orderId]);

  if (result.length === 0) return res.status(200).json([]);

  let orders = result;

  const ordersData = orders.map((order) => ({
    ...order,
    products_details: order.products_details.map((product) => ({
      ...product,
      product_image: `${req.protocol}://${req.get('host')}/api/images/product/${
        product.product_image
      }`,
    })),
  }));

  const orderSummary = ordersData[0];
  res.status(200).json(orderSummary);
});
