const axios = require('axios');
const Joi = require('joi');
const moment = require('moment');

const db = require('../../Database/dbconfig');
const razorpayInstance = require('../../Utils/razorpayInstance');
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

  const response = await axios.get(
    `https://api.postalpincode.in/pincode/${pincode}`
  );

  const { data } = response;
  const apiData = data[0];
  const { Status, Message, PostOffice } = apiData;

  if (Status !== 'Success')
    return next(new AppError(`Invalid Pincode (or) ${Message}`, 400));

  if (!PostOffice)
    return next(new AppError(`Invalid Pincode (or) ${Message}`, 400));

  const { State } = PostOffice[0];

  const query =
    'select azst_pin_days_number from  azst_pincode_no_of_days  Where azst_pin_days_state = ?';

  const result = await db(query, [State]);

  if (result.length === 0)
    return next(new AppError('Please Enter a valid Pincode Number'));
  const noOfDays = result[0].azst_pin_days_number;

  const expectedDateFrom = moment()
    .add(noOfDays, 'days')
    .format('DD MMM, YYYY');
  const expectedDateto = moment()
    .add(10 + noOfDays, 'days')
    .format('DD MMM, YYYY');

  res.status(200).json({ expectedDateFrom, expectedDateto });
});

function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase(); // Converts timestamp to base36

  const randomPart = Math.random().toString(36).toUpperCase().substring(2, 8); // Adds random part

  const orderId = (timestamp + randomPart).substring(0, 12);
  return 'AZSTA-' + orderId; // Combine and slice to 12 chars
}

const getCartTotal = (cartProducts) => {
  const subTotal = cartProducts.reduce(
    (acc, p) => (acc += parseInt(p.azst_cart_quantity) * parseInt(p.price)),
    0
  );

  const taxAmount = cartProducts.reduce((acc, p) => {
    const productPrice = parseInt(p.azst_cart_quantity) * parseInt(p.price);
    const taxPercentage = 10;
    const taxAmount = (productPrice / 100) * taxPercentage;
    return (acc += taxAmount);
  }, 0);
  return { subTotal, taxAmount };
};

const initiateRefund = async (paymentId, amount) => {
  try {
    await razorpayInstance.payments.refund(paymentId, {
      amount: amount * 100, // Assuming amount is in paise (smallest currency unit)
    });
  } catch (err) {
    throw new Error(err?.error?.description);
  }
};

const updateDiscountUsageOfCustomer = async function (
  customerId,
  discountCode,
  orderId
) {
  const query = `INSERT INTO azst_cus_dsc_mapping_tbl (azst_cdm_cus_id, azst_cdm_dsc_id, azst_cdm_order_id) VALUES (?, ?, ?)`;
  let codes = [];

  if (typeof discountCode === 'string') {
    codes = JSON.parse(discountCode); // Ensure it's a valid JSON array
  } else {
    codes = discountCode; // Assume it's an array already
  }

  for (let code of codes) {
    const values = [customerId, code, orderId];
    try {
      await db(query, values); // Assuming db is your database function
    } catch (error) {}
  }
};

exports.placeOrder = catchAsync(async (req, res, next) => {
  const {
    paymentMethod,
    paymentData,
    discountAmount,
    discountCode,
    cartList,
    orderSource,
    shippingCharge,
  } = req.body;

  // Extract payment details
  const { amount, currency, razorpay_order_id, razorpay_payment_id } =
    paymentData;
  try {
    // Extract customer details from userDetails
    const { user_id, user_email, user_district } = req.userDetails;

    if (
      paymentMethod === 'RazorPay' &&
      (!razorpay_order_id || !razorpay_payment_id)
    ) {
      return next(
        new AppError(
          `razorpay_order_id and razorpay_payment_id can't be empty`,
          400
        )
      );
    }

    if (!cartList || !Array.isArray(cartList)) {
      // Validate cartList
      return res.status(400).json({ message: 'Cart is empty or invalid' });
    }

    const cartProducts = cartList;

    // Generate a unique order ID
    const orderId = generateOrderId();

    // Calculate order total, tax, and subtotal
    const { subTotal, taxAmount } = getCartTotal(cartProducts);
    const orderTotalAmount =
      subTotal + taxAmount + shippingCharge - discountAmount;

    // Determine financial status
    const financialStatus =
      amount === orderTotalAmount ? 'paid' : 'partially paid';
    const paidOn = moment().format('YYYY-MM-DD HH:mm:ss');

    // Determine fulfillment status
    const fulfillmentStatus =
      financialStatus === 'paid' ? 'fulfilled' : 'unfulfilled';
    const fulfilledOn =
      fulfillmentStatus === 'fulfilled'
        ? moment().format('YYYY-MM-DD HH:mm:ss')
        : null;

    const getCheckOutId = () => {
      const timestamp = Date.now().toString(36).toUpperCase(); // Converts timestamp to base36
      return 'AZSTA-' + timestamp;
    };

    // Determine payment reference
    const paymentReference = paymentMethod === 'COD' ? 'COD' : 'ONLINE';
    const checkOutId =
      paymentMethod === 'COD' ? getCheckOutId() : razorpay_order_id;
    const paymentId = paymentMethod === 'COD' ? null : razorpay_payment_id;

    // SQL query for inserting order data
    const query = `INSERT INTO azst_orders_tbl (
                      azst_orders_id, azst_orders_email, azst_orders_financial_status, azst_orders_paid_on,
                      azst_orders_fulfillment_status, azst_orders_fulfilled_on,
                      azst_orders_currency, azst_orders_subtotal, azst_orders_taxes, azst_orders_total,
                      azst_orders_discount_code, azst_orders_discount_amount, azst_orders_customer_id,
                      azst_orders_payment_method, azst_orders_payment_reference,
                      azst_orders_source, azst_orders_checkout_id, azst_orders_payment_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      orderId,
      user_email,
      financialStatus,
      paidOn,
      fulfillmentStatus,
      fulfilledOn,
      currency,
      subTotal,
      taxAmount,
      orderTotalAmount,
      JSON.stringify(discountCode),
      discountAmount,
      user_id,
      paymentMethod,
      paymentReference,
      orderSource,
      checkOutId,
      paymentId,
    ];

    // Execute query
    const result = await db(query, values); // Fixed typo from value to values
    if (result.affectedRows === 0) {
      throw Error('Failed to place order', 400);
    }

    // Pass order ID to the next middleware
    req.orderData = orderId;
    next();
  } catch (error) {
    // Attempt to refund if payment was made via RazorPay and order placement failed
    if (paymentMethod === 'RazorPay' && razorpay_payment_id) {
      try {
        const response = await initiateRefund(razorpay_payment_id, amount);
      } catch (refundError) {
        return next(new AppError(refundError.message, 400));
      }
    }

    return next(
      new AppError(error.message || 'Oops, something went wrong', 400)
    );
  }
});

exports.orderInfo = catchAsync(async (req, res, next) => {
  const { paymentData, addressId, isBillingAdsame, shippingCharge } = req.body;

  const orderId = req.orderData;
  const customerId = req.empId;

  if (!paymentData || !addressId || !orderId || !customerId) {
    return res
      .status(400)
      .json({ message: 'Missing required order information' });
  }

  const { notes = '', noteAttributes = '' } = paymentData;

  const query = `
    INSERT INTO azst_orderinfo_tbl (
      azst_orders_id,
      azst_orders_customer_id,
      azst_addressbook_id,
      azst_orderinfo_notes,
      azst_orderinfo_note_attributes,
      azst_orderinfo_shippingtype,
      azst_orderinfo_shpping_amount,
      azst_orderinfo_billing_adrs_issame
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const shippingType = shippingCharge > 0 ? 'paid shipping' : 'free shipping';

  const values = [
    orderId,
    customerId,
    addressId,
    notes,
    noteAttributes,
    shippingType,
    shippingCharge,
    isBillingAdsame,
  ];
  await db(query, values);
  next(); // Proceed to the next middleware
});

exports.orderSummary = catchAsync(async (req, res, next) => {
  const { cartList, discountCode } = req.body;
  const orderId = req.orderData;
  const customerId = req.empId;

  if (!cartList || !Array.isArray(cartList) || cartList.length === 0) {
    return res.status(400).json({ message: 'Cart is empty or invalid' });
  }

  const insertQuery = `
    INSERT INTO azst_ordersummary_tbl (
      azst_orders_id,
      azst_order_product_id,
      azst_order_variant_id,
      azst_order_qty,
      azst_order_delivery_method,
      azst_product_price
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const removeQuery = `DELETE FROM azst_cart_tbl WHERE azst_cart_id = ?`;

  for (let product of cartList) {
    const {
      azst_cart_product_id,
      azst_cart_variant_id,
      azst_cart_quantity,
      price,
      azst_cart_id,
    } = product;

    const values = [
      orderId,
      azst_cart_product_id,
      azst_cart_variant_id,
      azst_cart_quantity,
      'POSTAL',
      price,
    ];

    const result = await db(insertQuery, values);

    if (result.affectedRows > 0) {
      await db(removeQuery, [azst_cart_id]);
    } else {
      return next(
        new AppError(
          `Failed to insert product ${azst_cart_product_id} into order summary`,
          400
        )
      );
    }
  }
  updateDiscountUsageOfCustomer(customerId, discountCode, orderId);
  res.status(200).json({ orderId, message: 'Order placed successfully' });
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
