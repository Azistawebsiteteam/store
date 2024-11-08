const db = require('../../Database/dbconfig');
const Joi = require('joi');
const moment = require('moment');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');

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
  const { customerId, pageNum = 1 } = req.body;

  const pageSize = 50;
  const offset = (pageNum - 1) * pageSize;

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
                       ORDER BY azst_orders_tbl.azst_orders_created_on DESC
                       LIMIT ${pageSize} OFFSET ${offset}`;

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
  orderStatus: Joi.number().required().valid(1, 2), // 1 means confirm , 2 means Recject
  inventoryId: Joi.string().when('orderStatus', {
    is: 1, // When orderStatus is 1
    then: Joi.required(), // inventoryId is required
    otherwise: Joi.optional().allow('', null), // Otherwise, it's optional
  }),
  reason: Joi.string().when('orderStatus', {
    is: 2, // When orderStatus is 2
    then: Joi.required(), // inventoryId is required
    otherwise: Joi.optional().allow('', null), // Otherwise, it's optional
  }),
});

exports.confirmOrder = catchAsync(async (req, res, next) => {
  // Validate request body
  const { error } = confirmSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const { orderId, orderStatus, reason, inventoryId } = req.body;
  const time = moment().format('YYYY-MM-DD HH:mm:ss');
  const isOrderConfirmed = orderStatus === 1;

  // Define SQL fields and values based on order status
  const orderFields = isOrderConfirmed
    ? 'azst_orders_confirm_status = ?, azst_orders_confirm_by = ?, azst_orders_confirm_on = ?'
    : 'azst_orders_confirm_status = ?, azst_orders_cancelled_by = ?, azst_orders_cancelled_on = ?, azst_orders_cancelled_reason = ?';

  const values = isOrderConfirmed
    ? [orderStatus, req.empId, time, orderId]
    : [orderStatus, req.empId, time, reason, orderId];

  // Construct and execute the update query
  const updateQuery = `UPDATE azst_orders_tbl SET ${orderFields} WHERE azst_orders_id = ?`;
  const updateResult = await db(updateQuery, values);

  if (updateResult.affectedRows === 0) {
    return next(new AppError('Order update failed', 400));
  }

  // Fetch customer ID after successful order update
  const [customerResult] = await db(
    `SELECT azst_orders_customer_id FROM azst_orders_tbl WHERE azst_orders_id = ?`,
    [orderId]
  );
  const customerId = customerResult?.azst_orders_customer_id;
  if (!customerId) return next(new AppError('Customer not found', 404));

  // Initialize SMS service
  const smsService = new Sms(customerId, null);
  await smsService.getUserDetails();

  // Send SMS based on order status and proceed accordingly
  if (isOrderConfirmed) {
    await smsService.orderConfirm(orderId);
    // Step 3: Update the shipping inventory in the order info table
    const updateOrderInfoQuery = `
    UPDATE azst_orderinfo_tbl 
    SET azst_order_ship_from = ? 
    WHERE azst_orders_id = ?`;

    await db(updateOrderInfoQuery, [inventoryId, orderId]);
    req.body.orderAction = 'Confirm';
    return next();
  } else {
    await smsService.orderRected(orderId);
    return res.status(200).json({ message: 'Order status updated' });
  }
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const { orderId, inventoryId, orderAction } = req.body;

  // Step 1: Get the products related to the order
  const getQtyQuery = `
    SELECT azst_order_product_id, azst_order_variant_id, azst_order_qty
    FROM azst_ordersummary_tbl
    WHERE azst_orders_id = ?`;

  const products = await db(getQtyQuery, [orderId]);
  if (products.length === 0)
    return next(new AppError('No products found for this order', 404));

  // Determine the column to update based on order action
  const updateColumn =
    orderAction === 'Confirm'
      ? 'azst_ipm_onhand_quantity = azst_ipm_onhand_quantity - ?, azst_ipm_commit_quantity = azst_ipm_commit_quantity + ?'
      : 'azst_ipm_avbl_quantity = azst_ipm_avbl_quantity - ?, azst_ipm_commit_quantity = azst_ipm_commit_quantity - ?';

  // Step 2: Construct and execute inventory update queries for each product
  const updateInventoryPromises = products.map(
    ({ azst_order_product_id, azst_order_variant_id, azst_order_qty }) => {
      const updateInventoryQuery = `
      UPDATE azst_inventory_product_mapping 
      SET ${updateColumn}
      WHERE azst_ipm_inventory_id = ? 
        AND azst_ipm_product_id = ? 
        AND azst_ipm_variant_id = ?`;

      return db(updateInventoryQuery, [
        azst_order_qty,
        inventoryId,
        azst_order_product_id,
        azst_order_variant_id,
      ]);
    }
  );

  // Await all inventory update promises
  await Promise.all(updateInventoryPromises);
  const message =
    orderAction === 'Confirm'
      ? 'Order Confirm and Inventory updated successfully'
      : 'Order delivered and inventory updated successfully';
  // Step 3: Send a response back after successful inventory update
  res.status(200).json({ message });
});

exports.deliveryOrder = catchAsync(async (req, res, next) => {
  const { orderId, deliveryStatus } = req.body;
  const deliveryId = req.empId;

  if (!orderId) return next(new AppError('Order ID is required', 400));

  // Step 1: Fetch the order details
  const orderQuery = `
    SELECT ot.azst_orders_customer_id, azst_orders_total, azst_orders_delivery_status, azst_order_ship_from 
    FROM azst_orders_tbl AS ot
    LEFT JOIN azst_orderinfo_tbl AS oi ON ot.azst_orders_id = oi.azst_orders_id 
    WHERE ot.azst_orders_id = ? AND ot.azst_orders_status = 1 
      AND ot.azst_orders_confirm_status = 1`;

  const [order] = await db(orderQuery, [orderId]);
  if (!order) return next(new AppError('No order found for delivery', 404));

  const {
    azst_orders_customer_id,
    azst_orders_total,
    azst_orders_delivery_status,
    azst_order_ship_from,
  } = order;

  if (azst_orders_delivery_status === 2) {
    return next(new AppError('Order already delivered', 400));
  }

  // Step 2: Update the order delivery status and date
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const updateOrderQuery = `
    UPDATE azst_orders_tbl 
    SET azst_orders_delivery_status = ?, 
        azst_orders_delivery_on = ? 
    WHERE azst_orders_id = ? 
      AND azst_orders_status = 1 
      AND azst_orders_confirm_status = 1`;

  const deliveryUpdateResult = await db(updateOrderQuery, [
    deliveryStatus,
    today,
    orderId,
  ]);

  if (deliveryUpdateResult.affectedRows === 0) {
    return next(new AppError('Failed to update order delivery status', 400));
  }

  // If deliveryStatus is 1, respond immediately and skip further updates
  if (parseInt(deliveryStatus) === 1) {
    return res
      .status(200)
      .json({ message: 'Order delivery status updated successfully' });
  }

  // Step 3: Update the customer record with the total spent and total orders
  const updateCustomerQuery = `
    UPDATE azst_customers_tbl 
    SET azst_customer_totalspent = azst_customer_totalspent + ?, 
        azst_customer_totalorders = azst_customer_totalorders + 1 
    WHERE azst_customer_id = ?`;

  await db(updateCustomerQuery, [azst_orders_total, azst_orders_customer_id]);

  // Step 4: Update inventory for delivered order and send final response
  req.body.orderAction = 'Delivered';
  req.body.inventoryId = azst_order_ship_from;
  exports.updateInventory(req, res, next);
});
