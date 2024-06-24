const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');

const catchAsync = require('../../Utils/catchAsync');

const organizCustomerData = require('../CustomerCtrls/datafunctions');

exports.getAllCustomers = catchAsync(async (req, res, next) => {
  let { isActive, orderbyKey, sort } = req.body;

  orderbyKey = orderbyKey ? orderbyKey : 'azst_customer_createdon';

  sort = sort ? sort : 'DESC';

  // Validating the orderbyKey and sort parameters
  const validOrderbyKeys = {
    totalorder: 'azst_customer_totalorders',
    totalamountspent: 'azst_customer_totalspent',
    lastupdated: 'azst_customer_updatedon',
    default: 'azst_customer_createdon ',
  };

  const validSortOrders = ['ASC', 'DESC'];

  // Construct the orderbyQuery using validated inputs
  const orderbyQuery =
    validOrderbyKeys[orderbyKey.toLowerCase()] || validOrderbyKeys.default;

  const sortOrder = validSortOrders.includes(sort.toUpperCase())
    ? sort.toUpperCase()
    : 'DESC';

  // Construct the filterQuery securely using parameterized queries
  let filterQuery = '';
  let queryParams = [];
  if (typeof isActive !== 'undefined') {
    filterQuery = 'WHERE azst_customer_status = ?';
    queryParams.push(isActive);
  }

  const getUsers = `
    SELECT 
      azst_customer_id,
      azst_customer_fname,
      azst_customer_lname,
      azst_customer_mobile,
      azst_customer_email,
      azst_customer_acceptemail_marketing,
      azst_customer_status,
      DATE_FORMAT(azst_customer_createdon, '%d-%m-%Y %H:%i:%s') as registered_on,
      azst_customer_gender,
      azst_customer_state,
      azst_customer_country,
      azst_customer_totalspent,
      azst_customer_totalorders
    FROM azst_customer
    ${filterQuery}
    ORDER BY ${orderbyQuery} ${sortOrder}`;

  const users = await db(getUsers, queryParams);
  res.status(200).json(users);
});

exports.disableCustomer = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) return next(new AppError('User Id is required'));

  const disableQuery = `UPDATE azst_customer SET azst_customer_status = 0 , azst_customer_updatedby =? WHERE azst_customer_id = ?`;
  const response = await db(disableQuery, [req.empId, userId]);
  if (response.affectedRows > 0) {
    res.status(200).json({ message: 'User Account successfully disabled.' });
  } else {
    res.status(404).json({ message: 'User Account not found.' });
  }
});

// exports.deleteCustomer = catchAsync(async (req, res, next) => {
//   const { userId } = req.body;

//   if (!userId) return next(new AppError('User Id is required'));

//   const deleteQuery = `
//     DELETE FROM azst_customer
//     WHERE azst_customer_id = ? AND azst_customer_totalorders = 0
//   `;

//   const response = await db(deleteQuery, [userId]);

//   if (response.affectedRows > 0)
//     return res
//       .status(200)
//       .json({ message: 'User Account successfully deleted.' });
//   next(
//     new AppError(
//       `This can't be deleted because they have personal orders.`,
//       400
//     )
//   );
// });

exports.getUserDetailsAndLastOrder = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  const customerData = organizCustomerData(req.userDetails);

  const ordersQuery = `
    SELECT  azst_orders_tbl.* ,azst_ordersummary_tbl.*, product_title,image_src, price, offer_price, option1,
    option2,
    option3
    FROM azst_orders_tbl
    LEFT JOIN azst_ordersummary_tbl 
      ON azst_orders_tbl.azst_orders_id = azst_ordersummary_tbl.azst_orders_id
    LEFT JOIN azst_products
      ON azst_ordersummary_tbl.azst_order_product_id = azst_products.id
    LEFT JOIN azst_sku_variant_info
      ON azst_ordersummary_tbl.azst_order_variant_id = azst_sku_variant_info.id
    WHERE azst_orders_tbl.azst_orders_id = (
      SELECT azst_orders_id 
      FROM azst_orders_tbl 
      WHERE azst_orders_customer_id = ?
      ORDER BY azst_orders_created_on DESC 
      LIMIT 1
    )
  `;

  const result = await db(ordersQuery, [userId]);

  const latestOrder = {
    azst_orders_tbl_id: result[0].azst_orders_tbl_id,
    azst_orders_id: result[0].azst_orders_id,
    azst_orders_email: result[0].azst_orders_email,
    azst_orders_financial_status: result[0].azst_orders_financial_status,
    azst_orders_paid_on: result[0].azst_orders_paid_on,
    azst_orders_fulfillment_status: result[0].azst_orders_fulfillment_status,
    azst_orders_fulfilled_on: result[0].azst_orders_fulfilled_on,
    azst_orders_currency: result[0].azst_orders_currency,
    azst_orders_subtotal: result[0].azst_orders_subtotal,
    azst_orders_shipping: result[0].azst_orders_shipping,
    azst_orders_taxes: result[0].azst_orders_taxes,
    azst_orders_total: result[0].azst_orders_total,
    azst_orders_discount_code: result[0].azst_orders_discount_code,
    azst_orders_discount_amount: result[0].azst_orders_discount_amount,
    azst_orders_shipping_method: result[0].azst_orders_shipping_method,
    azst_orders_status: result[0].azst_orders_status,
    azst_orders_created_on: result[0].azst_orders_created_on,
    azst_orders_customer_id: result[0].azst_orders_customer_id,
    azst_orders_checkout_id: result[0].azst_orders_checkout_id,
    azst_orders_cancelled_at: result[0].azst_orders_cancelled_at,
    azst_orders_payment_method: result[0].azst_orders_payment_method,
    azst_orders_payment_reference: result[0].azst_orders_payment_reference,
    azst_orders_vendor: result[0].azst_orders_vendor,
    azst_orders_vendor_code: result[0].azst_orders_vendor_code,
    azst_orders_tags: result[0].azst_orders_tags,
    azst_orders_source: result[0].azst_orders_source,
    azst_orders_billing_province_name:
      result[0].azst_orders_billing_province_name,
    azst_orders_shipping_province_name:
      result[0].azst_orders_shipping_province_name,
    azst_orders_payment_id: result[0].azst_orders_payment_id,
    azst_orders_payment_references: result[0].azst_orders_payment_references,
    azst_ordersummary_id: result[0].azst_ordersummary_id,
    products_details: result.map((order) => ({
      azst_order_product_id: order.azst_order_product_id,
      azst_order_variant_id: order.azst_order_variant_id,
      azst_order_qty: order.azst_order_qty,
      product_title: order.product_title,
      product_image: `${req.protocol}://${req.get('host')}/product/images/${
        order.image_src
      }`,
      price: order.price,
      offer_price: order.offer_price,
      option1: order.option1,
      option2: order.option2,
      option3: order.option3,
    })),
  };

  res.status(200).json({ customerData, latestOrder });
});

// azst_customer_id,
//   azst_customer_fname,
//   azst_customer_lname,
//   azst_customer_mobile,
//   azst_customer_email,
//   azst_customer_pwd,
//   azst_customer_hno,
//   azst_customer_area,
//   azst_customer_city,
//   azst_customer_district,
//   azst_customer_state,
//   azst_customer_country,
//   azst_customer_zip,
//   azst_customer_landmark,
//   azst_customer_acceptemail_marketing,
//   azst_customer_company,
//   azst_customer_address1,
//   azst_customer_address2,
//   azst_customer_acceptsms_marketing,
//   azst_customer_totalspent,
//   azst_customer_totalorders,
//   azst_customer_note,
//   azst_customer_taxexempts,
//   azst_customer_tags,
//   azst_customer_status,
//   azst_customer_createdon,
//   azst_customer_updatedon,
//   azst_customer_gender,
//   azst_customer_DOB;
//  azst_customer_updatedby,

// azst_orders_tbl_id,
//   azst_orders_id,
//   azst_orders_email,
//   azst_orders_financial_status,
//   azst_orders_paid_on,
//   azst_orders_fulfillment_status,
//   azst_orders_fulfilled_on,
//   azst_orders_currency,
//   azst_orders_subtotal,
//   azst_orders_shipping,
//   azst_orders_taxes,
//   azst_orders_total,
//   azst_orders_discount_code,
//   azst_orders_discount_amount,
//   azst_orders_shipping_method,
//   azst_orders_status,
//   azst_orders_created_on,
//   azst_orders_customer_id,
//   azst_orders_checkout_id,
//   azst_orders_cancelled_at,
//   azst_orders_payment_method,
//   azst_orders_payment_reference,
//   azst_orders_vendor,
//   azst_orders_vendor_code,
//   azst_orders_tags,
//   azst_orders_source,
//   azst_orders_billing_province_name,
//   azst_orders_shipping_province_name,
//   azst_orders_payment_id,
//   azst_orders_payment_references;
