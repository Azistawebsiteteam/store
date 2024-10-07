const db = require('../../Database/dbconfig');
const Joi = require('joi');
const moment = require('moment');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.getOrderStatics = catchAsync(async (req, res, next) => {
  const { formDays } = req.body;

  // Validate input using Joi
  const schema = Joi.object({
    formDays: Joi.number().min(0).max(30).required(),
  });

  const { error } = schema.validate({ formDays });
  if (error) return next(new AppError(error.message, 400));

  // Calculate the form date based on the input formDays
  const formDate = moment().subtract(formDays, 'days').format('YYYY-MM-DD');

  // SQL queries to fetch order statistics
  const ordersQuery = `
    SELECT
        COUNT(DISTINCT O.azst_orders_id) AS TotalOrders,
        COUNT(os.azst_ordersummary_id) AS TotalItems
    FROM
        azst_orders_tbl O
    LEFT JOIN
        azst_ordersummary_tbl os
    ON
        O.azst_orders_id = os.azst_orders_id
    WHERE
        O.azst_orders_created_on >= ?
  `;

  const returnsQuery = `
    SELECT COUNT(*) AS ReturnItems
    FROM azst_ordersummary_tbl os
    WHERE os.azst_product_is_returned = 1
    AND os.azst_product_return_date >= ?
  `;

  const fulfillmentOrdersQuery = `
    SELECT COUNT(*) AS FullFilOrders
    FROM azst_orders_tbl O
    WHERE O.azst_orders_fulfillment_status = 1
    AND O.azst_orders_fulfilled_on >= ?
  `;

  const deliveryOrdersQuery = `
    SELECT COUNT(*) AS deliveryOrders
    FROM azst_orders_tbl O
    WHERE O.azst_orders_delivery_status = 1
    AND O.azst_orders_delivery_on >= ?
  `;

  // Use Promise.all to execute the database queries concurrently
  const [results, returnOrders, fulfillmentOrders, deliveryOrders] =
    await Promise.all([
      db(ordersQuery, [formDate]),
      db(returnsQuery, [formDate]),
      db(fulfillmentOrdersQuery, [formDate]),
      db(deliveryOrdersQuery, [formDate]),
    ]);

  // Send the result as a JSON response
  res.status(200).json({
    TotalOrders: results[0].TotalOrders ?? 0,
    TotalItems: results[0].TotalItems ?? 0,
    ReturnItems: returnOrders[0].ReturnItems ?? 0,
    FullFilOrders: fulfillmentOrders[0].FullFilOrders ?? 0,
    deliveryOrders: deliveryOrders[0].deliveryOrders ?? 0,
  });
});

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
                        LEFT JOIN azst_customers_tbl
                        ON azst_customers_tbl.azst_customer_id = azst_orders_tbl.azst_orders_customer_id 
                       ${filterQuery}
                       GROUP BY azst_orders_tbl.azst_orders_id
                       ORDER BY azst_orders_tbl.azst_orders_created_on DESC `;
  const results = await db(ordersQuery, values);
  res.status(200).json(results);
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

const billingAddressQuery = `JSON_OBJECT( 
        'azst_customer_hno', azst_customers_tbl.azst_customer_hno,
        'azst_customer_area', azst_customers_tbl.azst_customer_area,
        'azst_customer_city',azst_customers_tbl.azst_customer_city ,
        'azst_customer_district', azst_customers_tbl.azst_customer_district,
        'azst_customer_state', azst_customers_tbl.azst_customer_state,
        'azst_customer_country', azst_customers_tbl.azst_customer_country,
        'azst_customer_zip', azst_customers_tbl.azst_customer_zip ,
        'azst_customer_landmark',azst_customers_tbl.azst_customer_landmark ,
        'azst_customer_company',azst_customers_tbl.azst_customer_company ,
        'azst_customer_address1',azst_customers_tbl.azst_customer_address1 ,
        'azst_customer_address2',azst_customers_tbl.azst_customer_address2 ) AS billing_address`;

exports.getCustomerOrders = catchAsync(async (req, res, next) => {
  const customerId = req.empId;
  const schema = Joi.object({
    customerId: Joi.number().min(1).required(),
  });

  const { error } = schema.validate({ customerId });
  if (error) return next(new AppError(error.message, 400));

  const orderQuery = `SELECT
                      azst_orders_status,
                      azst_orders_created_on,azst_orders_confirm_status,
                      azst_orders_delivery_status,azst_orders_total,
                      azst_orders_tbl.azst_orders_id as azst_order_id,
                      ${productDetailsQuery}                   
                    FROM azst_orders_tbl
                    LEFT JOIN azst_ordersummary_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
                    LEFT JOIN azst_products
                      ON azst_ordersummary_tbl.azst_order_product_id = azst_products.id
                    LEFT JOIN azst_sku_variant_info
                      ON azst_ordersummary_tbl.azst_order_variant_id = azst_sku_variant_info.id
                    WHERE azst_orders_tbl.azst_orders_customer_id = ?
                    GROUP BY azst_orders_tbl.azst_orders_id
                    ORDER BY azst_orders_tbl.azst_orders_created_on DESC ;
                    `;

  await db("SET SESSION sql_mode = ''");
  const result = await db(orderQuery, [customerId]);

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

  res.status(200).json(ordersData);
});

exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  const schema = Joi.object({
    orderId: Joi.string().min(1).required(),
  });

  const { error } = schema.validate({ orderId });
  if (error) return next(new AppError(error.message, 400));

  const orderQuery = `SELECT
                      azst_orders_tbl.*,azst_orderinfo_tbl.*,
                      azst_orders_tbl.azst_orders_id as azst_order_id,
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
      product_image: `${req.protocol}://${req.get('host')}/api/images/product/${
        order.product_image
      }`,
    })),
  };
  res.status(200).json(Order);
});

const confirmSchema = Joi.object({
  orderId: Joi.string().min(1).max(20).required(),
  orderStatus: Joi.number().required().valid(0, 1),
  inventoryId: Joi.string().when('orderStatus', {
    is: 1, // When orderStatus is 1
    then: Joi.required(), // inventoryId is required
    otherwise: Joi.optional(), // Otherwise, it's optional
  }),
});

exports.confirmOrder = catchAsync(async (req, res, next) => {
  const { orderId, orderStatus } = req.body;
  const { error } = confirmSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  // Ensure that orderStatus is either true or false (1 or 0)
  const time = moment().format('YYYY-MM-DD HH:mm:ss');

  // Construct the SQL fields based on the orderStatus
  const orderstatus = orderStatus
    ? 'azst_orders_confirm_status = 1'
    : 'azst_orders_status = 0';
  const orderUpdateBy = orderStatus
    ? 'azst_orders_confirm_by = ?'
    : 'azst_orders_cancelled_by = ?';
  const orderUpdatetime = orderStatus
    ? 'azst_orders_confirm_on = ?'
    : 'azst_orders_cancelled_on = ?';

  // Construct the full SQL query
  const query = `UPDATE azst_orders_tbl SET ${orderstatus}, ${orderUpdateBy}, ${orderUpdatetime}
                 WHERE azst_orders_id = ?`;

  // Construct the values array in the correct order
  const values = [req.empId, time, orderId];

  const result = await db(query, values);

  if (result.affectedRows > 0) {
    if (orderStatus === 1) {
      // Proceed to updateInventory if order is confirmed
      return next();
    } else {
      // Send response immediately if the order is cancelled
      return res.status(200).json({ message: 'Order status updated' });
    }
  }

  return next(new AppError('Something went wrong', 400));
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const { orderId, inventoryId } = req.body;

  // Step 1: Get the products related to the order
  const getQtyQuery = `SELECT azst_order_product_id,
                        azst_order_variant_id, azst_order_qty
                       FROM azst_ordersummary_tbl
                       WHERE azst_orders_id = ?`;

  const products = await db(getQtyQuery, [orderId]);

  // Step 2: Iterate through each product and update the inventory quantities directly
  const updateInventoryQuery = `UPDATE azst_inventory_product_mapping 
                                SET azst_ipm_onhand_quantity = azst_ipm_onhand_quantity - ?, 
                                    azst_ipm_avbl_quantity = azst_ipm_avbl_quantity - ? 
                                WHERE azst_ipm_inventory_id = ? 
                                  AND azst_ipm_product_id = ? 
                                  AND azst_ipm_variant_id = ?`;

  for (let product of products) {
    const { azst_order_product_id, azst_order_variant_id, azst_order_qty } =
      product;

    // Step 3: Update the inventory with the calculated quantities
    await db(updateInventoryQuery, [
      azst_order_qty,
      azst_order_qty,
      inventoryId,
      azst_order_product_id,
      azst_order_variant_id,
    ]);
  }

  // Step 4: Send a response back after inventory update is successful
  res.status(200).json({ message: 'Order status updated' });
});

exports.deliveryOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;
  const deliveryId = req.empId;

  if (!orderId) return next(new AppError('orderId is required', 400));

  // Step 1: Fetch the order details
  const orderQuery = `SELECT azst_orders_customer_id, azst_orders_total ,azst_orders_delivery_status 
                      FROM azst_orders_tbl 
                      WHERE azst_orders_id = ?`;
  const [order] = await db(orderQuery, [orderId]);

  if (!order) {
    return next(new AppError('No order found for delivery', 400));
  }

  const {
    azst_orders_customer_id,
    azst_orders_total,
    azst_orders_delivery_status,
  } = order;

  if (azst_orders_delivery_status === 1)
    return next(new AppError('order already delivered', 400));

  // Step 2: Update the order delivery status and date
  const updateOrderQuery = `UPDATE azst_orders_tbl 
                            SET azst_orders_delivery_status = 1, 
                                azst_orders_delivery_on = ? 
                            WHERE azst_orders_id = ?`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const delivery = await db(updateOrderQuery, [today, orderId]);

  if (delivery.affectedRows === 0) {
    return next(new AppError('Failed to update order delivery status', 400));
  }

  // Step 3: Update the customer record with the total spent and total orders
  const updateCustomerQuery = `UPDATE azst_customers_tbl 
                               SET azst_customer_totalspent = azst_customer_totalspent + ?, 
                                   azst_customer_totalorders = azst_customer_totalorders + 1 
                               WHERE azst_customer_id = ?`;

  await db(updateCustomerQuery, [azst_orders_total, azst_orders_customer_id]);

  res.status(200).json({ message: 'Order delivery completed successfully' });
});
