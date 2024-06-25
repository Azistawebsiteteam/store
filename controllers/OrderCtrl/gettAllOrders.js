const db = require('../../dbconfig');
const Joi = require('joi');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.getAllOrdrs = catchAsync(async (req, res, next) => {
  const { customerId } = req.body;

  let filterQuery = '';
  const values = [];
  if (customerId) {
    const schema = Joi.object({
      customerId: Joi.number().min(1).optional(),
    });

    const { error } = schema.validate({ customerId });
    if (error) return next(new AppError(error.message, 400));
    filterQuery = 'WHERE azst_orders_customer_id = ?';
    values.push(customerId);
  }

  await db("SET SESSION sql_mode = ''");

  const ordersQuery = `SELECT azst_orders_tbl.*,azst_ordersummary_tbl.azst_order_delivery_method,
                            IFNULL(SUM(azst_ordersummary_tbl.azst_order_qty), 0) AS items , 
                           CONCAT(azst_customer_fname , ' ' , azst_customer_lname) AS customer_name
                       FROM azst_orders_tbl
                        LEFT JOIN azst_ordersummary_tbl
                        ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
                        LEFT JOIN azst_customer
                        ON azst_customer.azst_customer_id = azst_orders_tbl.azst_orders_customer_id 
                       ${filterQuery}
                       GROUP BY azst_orders_tbl.azst_orders_id`;
  const results = await db(ordersQuery, values);
  res.status(200).json(results);
});

exports.getCustomerOrders = catchAsync(async (req, res, next) => {
  req.body.customerId = req.empId;
  next();
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

const shippingAddressquery = `JSON_OBJECT(
    'address_id', azst_customer_adressbook.azst_customer_adressbook_id,
    'address_fname', azst_customer_adressbook.azst_customer_adressbook_fname,
    'address_lname', azst_customer_adressbook.azst_customer_adressbook_lname,
    'address_mobile', azst_customer_adressbook.azst_customer_adressbook_mobile,
    'address_email', azst_customer_adressbook.azst_customer_adressbook_email,
    'address_hno', azst_customer_adressbook.azst_customer_adressbook_hno,
    'address_area', azst_customer_adressbook.azst_customer_adressbook_area,
    'address_city', azst_customer_adressbook.azst_customer_adressbook_city,
    'address_district', azst_customer_adressbook.azst_customer_adressbook_district,
    'address_state', azst_customer_adressbook.azst_customer_adressbook_state,
    'address_country', azst_customer_adressbook.azst_customer_adressbook_country,
    'address_zip', azst_customer_adressbook.azst_customer_adressbook_zip,
    'address_landmark', azst_customer_adressbook.azst_customer_adressbook_landmark,
    'address_home_company', azst_customer_adressbook.azst_customer_adressbook_home_company,
    'address_address1', azst_customer_adressbook.azst_customer_adressbook_address1,
    'address_address2', azst_customer_adressbook.azst_customer_adressbook_address2,
    'address_status', azst_customer_adressbook.azst_customer_adressbook_status,
    'address_available_time', azst_customer_adressbook.azst_customer_adressbook_available_time
  ) AS shipping_address`;

exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  const schema = Joi.object({
    orderId: Joi.string().min(1).required(),
  });

  const { error } = schema.validate({ orderId });
  if (error) return next(new AppError(error.message, 400));

  const orderQuery = `SELECT
                      azst_orders_tbl.*,azst_orderinfo_tbl.*,
                      ${productDetailsQuery},
                      ${shippingAddressquery}
                    FROM azst_orders_tbl
                    LEFT JOIN azst_ordersummary_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
                    LEFT JOIN azst_orderinfo_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_orderinfo_tbl.azst_orders_id
                    LEFT JOIN azst_customer_adressbook 
                      ON azst_orderinfo_tbl.azst_addressbook_id = azst_customer_adressbook.azst_customer_adressbook_id
                    LEFT JOIN azst_products
                      ON azst_ordersummary_tbl.azst_order_product_id = azst_products.id
                    LEFT JOIN azst_sku_variant_info
                      ON azst_ordersummary_tbl.azst_order_variant_id = azst_sku_variant_info.id
                    WHERE azst_orders_tbl.azst_orders_id = ?
                    GROUP BY azst_orders_tbl.azst_orders_id;
                    `;

  await db("SET SESSION sql_mode = ''");
  const result = await db(orderQuery, [orderId]);

  if (result.length === 0) return res.status(200).json({});

  let orderDetails = result[0];

  const Order = {
    ...orderDetails,
    products_details: orderDetails.products_details.map((order) => ({
      ...order,
      product_image: `${req.protocol}://${req.get('host')}/product/images/${
        order.product_image
      }`,
    })),
  };
  res.status(200).json(Order);
});
