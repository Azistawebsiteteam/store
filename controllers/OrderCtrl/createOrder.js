const { dbPool } = require('../../Database/dbPool');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const Email = require('../../Utils/email');
const razorpayInstance = require('../../Utils/razorpayInstance');

// Transaction Management
async function startTransaction() {
  return dbPool.query('START TRANSACTION');
}

async function commitTransaction() {
  return dbPool.query('COMMIT');
}

async function rollbackTransaction() {
  return dbPool.query('ROLLBACK');
}

// Helper functions for generating order ID and calculating cart totals
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).toUpperCase().substring(2, 8);
  const orderId = (timestamp + randomPart).substring(0, 12);
  return 'AZSTA-' + orderId;
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

// Refund initiation
const initiateRefund = async (paymentId, amount) => {
  try {
    await razorpayInstance.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paise
    });
  } catch (err) {
    throw new Error(err?.error?.description);
  }
};

// Place order
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

  const { amount, currency, razorpay_order_id, razorpay_payment_id } =
    paymentData;

  let orderId;

  try {
    await startTransaction(); // Start transaction

    const { user_id, user_email } = req.userDetails;

    if (
      paymentMethod === 'RazorPay' &&
      (!razorpay_order_id || !razorpay_payment_id)
    ) {
      throw new AppError(
        `razorpay_order_id and razorpay_payment_id can't be empty`,
        400
      );
    }

    if (!cartList || !Array.isArray(cartList)) {
      throw new AppError('Cart is empty or invalid', 400);
    }

    // Generate order ID
    orderId = generateOrderId();

    // Calculate order totals
    const { subTotal, taxAmount } = getCartTotal(cartList);
    const orderTotalAmount =
      subTotal + taxAmount + shippingCharge - discountAmount;

    // Determine financial status
    const financialStatus =
      amount === orderTotalAmount ? 'paid' : 'partially paid';
    const paidOn = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Fulfillment status
    const fulfillmentStatus =
      financialStatus === 'paid' ? 'fulfilled' : 'unfulfilled';
    const fulfilledOn = financialStatus === 'paid' ? paidOn : null;

    // Payment details
    const paymentReference = paymentMethod === 'COD' ? 'COD' : 'ONLINE';
    const checkOutId =
      paymentMethod === 'COD' ? generateOrderId() : razorpay_order_id;
    const paymentId = paymentMethod === 'COD' ? null : razorpay_payment_id;

    // Insert order data
    const query = `INSERT INTO azst_orders_tbl (
                    azst_orders_id, azst_orders_email, azst_orders_financial_status, azst_orders_paid_on,
                    azst_orders_fulfillment_status, azst_orders_fulfilled_on,
                    azst_orders_currency, azst_orders_subtotal, azst_orders_taxes, azst_orders_total,
                    azst_orders_discount_code, azst_orders_discount_amount, azst_orders_customer_id,
                    azst_orders_payment_method, azst_orders_payment_reference,
                    azst_orders_source, azst_orders_checkout_id, azst_orders_payment_id
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

    const [result] = await dbPool.query(query, values);
    if (result.affectedRows === 0) {
      throw new Error('Failed to place order');
    }

    req.orderId = orderId;
    // Proceed to orderInfo and orderSummary
    await exports.orderInfo(req, res, next);
    await exports.orderSummary(req, res, next);
    await exports.updateDiscountUsageOfCustomer(req, res, next);

    //await new Email(req.userDetails).sendOrderStatus(orderId);
    await commitTransaction(); // Commit transaction

    res.status(200).json({ orderId, message: 'Order placed successfully' });
  } catch (error) {
    await rollbackTransaction(); // Rollback transaction on error

    // Refund if payment was made via RazorPay and transaction fails
    if (paymentMethod === 'RazorPay' && razorpay_payment_id) {
      try {
        await initiateRefund(razorpay_payment_id, amount);
      } catch (refundError) {
        return next(new AppError(refundError.message, 400));
      }
    }

    return next(new AppError(error.message || 'Something went wrong', 400));
  }
});

// Insert order info
exports.orderInfo = async (req, res, next) => {
  const { paymentData, addressId, isBillingAdsame, shippingCharge } = req.body;
  const orderId = req.orderId;
  const customerId = req.empId;

  if (!paymentData || !addressId || !orderId || !customerId) {
    throw new AppError('Missing required order information', 400);
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

  await dbPool.query(query, values);
};

// Insert order summary
exports.orderSummary = async (req, res, next) => {
  const { cartList, discountCode } = req.body;
  const orderId = req.orderId;
  const customerId = req.empId;

  if (!cartList || !Array.isArray(cartList) || cartList.length === 0) {
    throw new AppError('Cart is empty or invalid', 400);
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

    const result = await dbPool.query(insertQuery, values);
    if (result[0].affectedRows > 0) {
      await dbPool.query(removeQuery, [azst_cart_id]);
    } else {
      throw new AppError(
        `Failed to insert product ${azst_cart_product_id} into order summary`,
        400
      );
    }
  }
};

// Update discount usage
exports.updateDiscountUsageOfCustomer = async (req, res, next) => {
  const { discountCode } = req.body;
  const orderId = req.orderId;
  const customerId = req.empId;

  const query = `INSERT INTO azst_cus_dsc_mapping_tbl (azst_cdm_cus_id, azst_cdm_dsc_id, azst_cdm_order_id) VALUES (?, ?, ?)`;
  let codes = [];

  if (typeof discountCode === 'string') {
    codes = JSON.parse(discountCode); // Ensure valid JSON array
  } else {
    codes = discountCode; // Assume it's an array
  }

  for (let code of codes) {
    const values = [customerId, code, orderId];
    await dbPool.query(query, values);
  }
};
