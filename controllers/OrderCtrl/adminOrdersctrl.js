const db = require('../../Database/dbconfig');
const { dbPool } = require('../../Database/dbPool');
const Joi = require('joi');
const moment = require('moment');
const axios = require('axios');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const { getShipToken } = require('../../shipRocket/shipInstance');
const {
  commitTransaction,
  rollbackTransaction,
  startTransaction,
} = require('../../Utils/transctions');

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
    WHERE O.azst_orders_delivery_status = 2
    AND O.azst_orders_delivery_on >= ?
  `;

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
      'azst_product_taxvalue' , azst_ordersummary_tbl.azst_product_taxvalue,
      'azst_dsc_amount' , azst_ordersummary_tbl.azst_dsc_amount,
      'azst_product_price', azst_ordersummary_tbl.azst_product_price,
      'product_title', azst_products.product_title,
      'product_image', azst_products.image_src,
      'product_weight', azst_products.product_weight,
      'option1', azst_sku_variant_info.option1,
      'option2', azst_sku_variant_info.option2,
      'option3', azst_sku_variant_info.option3,
      'azst_order_qty', azst_ordersummary_tbl.azst_order_qty,
      'sku_code', azst_products.sku_code,
      'variant_sku_code', azst_sku_variant_info.variant_sku,
      'variant_weight', azst_sku_variant_info.variant_weight,
      'variant_weight_unit', azst_sku_variant_info.variant_weight_unit,
      'hsn' , azst_sku_variant_info.variant_HS_code
    
    )
  ) AS products_details`;

const billingAddressQuery = `JSON_OBJECT( 
        'billing_name', CONCAT(customer.azst_customer_fname, " " , customer.azst_customer_lname),
        'billing_hno', customer.azst_customer_hno,
        'billing_mobile', customer.azst_customer_mobile,
        'billing_area', customer.azst_customer_area,
        'billing_city',customer.azst_customer_city ,
        'billing_district', customer.azst_customer_district,
        'billing_state', customer.azst_customer_state,
        'billing_country', customer.azst_customer_country,
        'billing_zip', customer.azst_customer_zip ,
        'billing_landmark',customer.azst_customer_landmark ,
        'billing_company',customer.azst_customer_company ,
        'billing_address1',customer.azst_customer_address1 ,
        'billing_address2',customer.azst_customer_address2 ) AS billing_address`;

const shippingAddressQuery = `JSON_OBJECT(
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

const shippingFromAddressQuery = `JSON_OBJECT(
    'inventory_id', ilt.inventory_id,
    'inventory_name', ilt.inventory_name,
    'inventory_location', ilt.inventory_location,
    'inventory_address', ilt.inventory_address,
    'inventory_mail', ilt.inventory_mail,
    'inventory_phone', ilt.inventory_phone
  ) AS order_shipping_from`;

const getOrderInformation = async (orderId) => {
  try {
    const orderQuery = `
    SELECT
      azst_orders_tbl.*,
      azst_orderinfo_tbl.*,
      azst_orders_tbl.azst_orders_id as azst_order_id,
      ${productDetailsQuery},
      ${shippingAddressQuery},
      ${shippingFromAddressQuery},
      ${billingAddressQuery}
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
    LEFT JOIN azst_inventory_locations_tbl AS ilt
      ON azst_orderinfo_tbl.azst_order_ship_from = ilt.inventory_id
    LEFT JOIN azst_customers_tbl AS customer 
      ON  azst_orderinfo_tbl.azst_orders_customer_id = customer.azst_customer_id
    WHERE azst_orders_tbl.azst_orders_id = ?
    GROUP BY azst_orders_tbl.azst_orders_id;
  `;

    await db("SET SESSION sql_mode = ''");

    // Execute the query with the provided orderId
    const [order] = await db(orderQuery, [orderId]);
    return order;
  } catch (error) {
    throw new AppError('Failed to fetch order information', 500);
  }
};

exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  // Validate input
  const schema = Joi.object({
    orderId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  });

  const { error } = schema.validate({ orderId });
  if (error) {
    return next(new AppError(`Validation error: ${error.message}`, 400));
  }

  let order;
  try {
    order = await getOrderInformation(orderId);
  } catch (error) {
    return next(error); // Pass database errors to global error handler
  }

  // If no result, return not found response
  if (!order) {
    return res.status(200).json({});
  }

  // Format order data
  const formattedOrder = {
    ...order,
    products_details: order.products_details
      ? order.products_details.map((p) => ({
          ...p,
          product_image: p.product_image
            ? `${req.protocol}://${req.get('host')}/api/images/product/${
                p.product_image
              }`
            : null,
        }))
      : [],
  };

  res.status(200).json(formattedOrder);
});

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
                      IFNULL(azst_order_returns.return_id , 0) AS return_id,
                      ${productDetailsQuery}                   
                    FROM azst_orders_tbl
                    LEFT JOIN azst_ordersummary_tbl 
                      ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
                    LEFT JOIN azst_products
                      ON azst_ordersummary_tbl.azst_order_product_id = azst_products.id
                    LEFT JOIN azst_sku_variant_info
                      ON azst_ordersummary_tbl.azst_order_variant_id = azst_sku_variant_info.id
                    LEFT JOIN azst_order_returns
                      ON azst_orders_tbl.azst_orders_id = azst_order_returns.order_id
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

exports.deliveryOrder = catchAsync(async (req, res, next) => {
  const { orderId, deliveryStatus } = req.body;

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

const executeQuery = async (query, params = []) => {
  try {
    const [result] = await dbPool.query(query, params);
    return result;
  } catch (error) {
    throw new AppError(error.message || 'Database query failed', 500);
  }
};

const updateOrderStatus = async (orderId, statusData) => {
  const { fields, values } = statusData;
  const query = `UPDATE azst_orders_tbl SET ${fields} WHERE azst_orders_id = ?`;
  
  const result = await executeQuery(query, [...values, orderId]);
  if (result.affectedRows === 0) {
    throw new AppError('Order update failed', 400);
  }
  return result;
};

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
  shippingMethod: Joi.string().when('orderStatus', {
    is: 1, // When orderStatus is 1
    then: Joi.required(), // inventoryId is required
    otherwise: Joi.optional().allow('', null), // Otherwise, it's optional
  }),
});

exports.confirmOrder = catchAsync(async (req, res, next) => {
  const { error } = confirmSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const { orderId, orderStatus, reason, inventoryId, shippingMethod } =
    req.body;

  const isOrderConfirmed = orderStatus === '1';
  const time = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    await startTransaction();

    // Update order status
    const statusData = isOrderConfirmed
      ? {
          fields:
            'azst_orders_confirm_status = ?, azst_orders_confirm_by = ?, azst_orders_confirm_on = ?',
          values: [orderStatus, req.empId, time],
        }
      : {
          fields:
            'azst_orders_confirm_status = ?, azst_orders_cancelled_by = ?, azst_orders_cancelled_on = ?, azst_orders_cancelled_reason = ?',
          values: [orderStatus, req.empId, time, reason],
        };

    await updateOrderStatus(orderId, statusData);

    // Get customer ID
    const customerQuery = `SELECT azst_orders_customer_id FROM azst_orders_tbl WHERE azst_orders_id = ?`;
    const [customer] = await executeQuery(customerQuery, [orderId]);
    const customerId = customer?.azst_orders_customer_id;
    if (!customerId) throw new AppError('Customer not found', 404);

    const smsService = new Sms(customerId, null);
    await smsService.getUserDetails();

    if (isOrderConfirmed) {
      // Update shipping details
      const shippingQuery = `
        UPDATE azst_orderinfo_tbl
        SET azst_order_ship_method = ?, azst_order_ship_from = ?
        WHERE azst_orders_id = ?`;
      await executeQuery(shippingQuery, [shippingMethod, inventoryId, orderId]);

      await exports.shipOrderTrack(req, res, next);
      req.body.orderAction = 'Confirm';
      const message = await exports.updateInventory(req, res, next);

      // Commit transaction
      await commitTransaction();
      await smsService.orderConfirm(orderId);
      res.status(200).json({ message });
    } else {
      await commitTransaction();
      await smsService.orderRected(orderId);
      return res.status(200).json({
        message: 'Order Rejected Successfully',
      });
    }
  } catch (error) {
    await rollbackTransaction();
    return next(new AppError(error.message || 'Something went wrong', 500));
  }
});

exports.updateInventory = async (req, res, next) => {
  const { orderId, inventoryId, orderAction } = req.body;

  const getQtyQuery = `
    SELECT azst_order_product_id, azst_order_variant_id, azst_order_qty
    FROM azst_ordersummary_tbl
    WHERE azst_orders_id = ?`;

  const products = await executeQuery(getQtyQuery, [orderId]);
  if (!products.length)
    throw new AppError('No products found for this order', 404);

  const updateColumn =
    orderAction === 'Confirm'
      ? 'azst_ipm_onhand_quantity = azst_ipm_onhand_quantity - ?, azst_ipm_commit_quantity = azst_ipm_commit_quantity + ?'
      : 'azst_ipm_avbl_quantity = azst_ipm_avbl_quantity - ?, azst_ipm_commit_quantity = azst_ipm_commit_quantity - ?';

  const updatePromises = products.map(
    ({ azst_order_product_id, azst_order_variant_id, azst_order_qty }) =>
      executeQuery(
        `UPDATE azst_inventory_product_mapping
       SET ${updateColumn}
       WHERE azst_ipm_inventory_id = ? AND azst_ipm_product_id = ? AND azst_ipm_variant_id = ?`,
        [
          azst_order_qty,
          azst_order_qty,
          inventoryId,
          azst_order_product_id,
          azst_order_variant_id,
        ]
      )
  );

  await Promise.all(updatePromises);

  return orderAction === 'Confirm'
    ? 'Order Confirmed and Inventory Updated Successfully'
    : 'Order Delivered and Inventory Updated Successfully';
};

const calculateTax = (productPrice, qty, tax) => {
  const price = parseFloat(productPrice ?? 0);
  const percentage = parseFloat(tax || 10);
  const taxAmount = ((price * qty) / 100) * percentage;
  return taxAmount;
};

// Map Order Details to ShipRocket Body
const mapOrderDetailsToBody = (orderDetails) => {
  return {
    order_id: orderDetails.azst_orders_id.replace(/[^a-zA-Z0-9]/g, ''), // Ensure order_id is alphanumeric
    order_date: moment(orderDetails.azst_orders_created_on).format(
      'YYYY-MM-DD HH:mm:ss'
    ),
    pickup_location:
      orderDetails.order_shipping_from?.inventory_location || 'Azista-Chintal',
    comment: `Reseller: ${orderDetails.azst_orders_vendor || 'Azista'}`,
    billing_customer_name: orderDetails.billing_address.billing_name,
    billing_last_name: '', // Can be derived if necessary
    billing_address: orderDetails.billing_address.billing_address1,
    billing_address_2: orderDetails.billing_address.billing_address2 || '',
    billing_city: orderDetails.billing_address.billing_city,
    billing_pincode: parseInt(orderDetails.billing_address.billing_zip, 10),
    billing_state: orderDetails.billing_address.billing_state,
    billing_country: orderDetails.billing_address.billing_country,
    billing_email: orderDetails.azst_orders_email,
    billing_phone: parseInt(orderDetails.billing_address.billing_mobile, 10),
    shipping_is_billing: false, // Always false as per the example
    shipping_customer_name: orderDetails.shipping_address.address_fname,
    shipping_last_name: orderDetails.shipping_address.address_lname || '',
    shipping_address: orderDetails.shipping_address.address_address1,
    shipping_address_2: orderDetails.shipping_address.address_address2 || '',
    shipping_city: orderDetails.shipping_address.address_district,
    shipping_pincode: parseInt(orderDetails.shipping_address.address_zip, 10),
    shipping_country: orderDetails.shipping_address.address_country,
    shipping_state: orderDetails.shipping_address.address_state,
    shipping_email: orderDetails.shipping_address.address_email || '',
    shipping_phone: parseInt(orderDetails.shipping_address.address_mobile, 10),
    order_items: orderDetails.products_details.map((product) => ({
      name: product.product_title,
      sku: product.sku_code || product.variant_sku_code || '',
      units: parseInt(product.azst_order_qty, 10),
      selling_price: parseFloat(product.azst_product_price),
      discount: parseFloat(product.azst_dsc_amount || 0),
      tax: calculateTax(
        product.azst_product_price,
        product.azst_order_qty,
        product.azst_product_taxvalue
      ),
      hsn: product.hsn || '', // HSN may not always be provided
    })),
    payment_method:
      orderDetails.azst_orders_payment_method === 'RazorPay'
        ? 'Prepaid'
        : 'COD',
    shipping_charges: parseFloat(
      orderDetails.azst_orderinfo_shpping_amount || 0
    ),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: parseFloat(orderDetails.azst_orders_discount_amount || 0),
    sub_total: parseFloat(orderDetails.azst_orders_subtotal || 0),
    length: 1.0,
    breadth: 1.0,
    height: 1.0,
    weight: 1.0,
  };
};

exports.shipOrderTrack = async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('Order ID is required', 400);
  }

  try {
    // Fetch order details
    const orderDetails = await getOrderInformation(orderId);
    if (!orderDetails) {
      throw new AppError('Order details not found', 404);
    }

    // Map order details to ShipRocket API format
    const body = mapOrderDetailsToBody(orderDetails);

    // Get ShipRocket API token
    const token = await getShipToken();
    if (!token) {
      throw new AppError('Failed to retrieve ShipRocket token', 500);
    }

    // ShipRocket API request headers
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Call ShipRocket API

    const url = `https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`;
    const { data } = await axios.post(url, body, { headers });
    // Update shipment ID in the database
    if (data?.order_id) {
      const updateShipmentQuery = `
        UPDATE azst_orderinfo_tbl 
        SET azst_order_shipment_id = ? 
        WHERE azst_orders_id = ?`;

      await executeQuery(updateShipmentQuery, [data.order_id, orderId]);
    } else {
      throw new AppError('Failed to create shipment in ShipRocket', 400);
    }
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message || error.message || 'Something went wrong';
    throw new AppError(errorMessage, 500);
  }
};

