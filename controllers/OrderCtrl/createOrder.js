const moment = require('moment');
const { dbPool } = require('../../Database/dbPool');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { getEstimateDates } = require('../../Utils/estimateDate');

const Email = require('../../Utils/email');
const razorpayInstance = require('../../Utils/razorpay');
const Sms = require('../../Utils/sms');
const {
  calculateCartTotalValue,
  getCartTaxTotal,
} = require('../../Utils/cartCalculations');
const {
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = require('../../Utils/transctions');

// Transaction Management

// Helper functions for generating order ID and calculating cart totals
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).toUpperCase().substring(2, 8);
  const orderId = (timestamp + randomPart).substring(0, 12);
  return 'AZS' + orderId;
}

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

// Fetch Cart Details
exports.getCartDetails = catchAsync(async (req, res, next) => {
  const { cartList } = req.body;

  const parsedCartList = Array.isArray(cartList)
    ? cartList
    : JSON.parse(cartList);

  if (!parsedCartList || !parsedCartList.length) {
    throw new AppError('Cart list is empty or invalid', 400);
  }

  // Construct the query with placeholders
  const placeholders = parsedCartList.map(() => '?').join(',');

  const query = `SELECT ac.azst_cart_id,
        ac.azst_cart_product_id,
        ac.azst_cart_variant_id,
        ac.azst_cart_quantity,    
        ac.azst_cart_collection_id,
        ac.azst_cart_product_type,
        ac.azst_cart_dsc_amount,
        ac.azst_cart_dsc_code,
        ac.azst_cart_dsc_by_ids,
        ap.product_main_title,
        ap.price,
        ap.compare_at_price as  product_compare_at_price,
        ap.is_taxable,
        ap.is_varaints_aval,
        ap.product_return_accept,
        IFNULL(ap.product_return_days , 0) AS product_return_days,
        av.compare_at_price,
        av.offer_price
    FROM azst_cart_tbl AS ac
    LEFT JOIN azst_products AS ap ON ac.azst_cart_product_id = ap.id
    LEFT JOIN azst_sku_variant_info AS av ON ac.azst_cart_variant_id = av.id
    WHERE ac.azst_cart_status = 1 AND ac.azst_customer_id = '${req.empId}' AND ac.azst_cart_id IN (${placeholders})`;

  // Execute query with parsed cart list
  const [result] = await dbPool.query(query, parsedCartList);
  req.cartProducts = result;

  next(); // Move to the next middleware/controller function
});

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

    if (!req.cartProducts || req.cartProducts.length === 0) {
      throw new AppError('No products found in the cart', 400);
    }

    const {
      user_id,
      user_email,
      user_mobile,
      user_acceptsms,
      user_acceptemail,
    } = req.userDetails;

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
    const subTotal = calculateCartTotalValue(req.cartProducts);
    const taxAmount = getCartTaxTotal(req.cartProducts);

    const orderTotalAmount =
      subTotal + taxAmount + shippingCharge - discountAmount;

    // Determine financial status
    const financialStatus =
      amount === orderTotalAmount ? 'paid' : 'partially paid';
    const paidOn = moment().format('YYYY-MM-DD HH:mm:ss');

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
    if (user_acceptsms !== 'No') {
      await new Sms(null, user_mobile).orderPlaced(orderId);
    }
    if (user_acceptemail !== 'No') {
      await new Email(null, user_email).orderPlaced(
        orderId,
        orderTotalAmount,
        req.cartProducts
      );
    }

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

const getExpectedDate = async (req, res, next) => {
  try {
    const { addressId } = req.body;
    const query = `SELECT azst_customer_adressbook_zip FROM azst_customer_adressbook WHERE azst_customer_adressbook_id = ?`;
    const [address] = await dbPool.query(query, [addressId]);

    if (!address || address.length === 0) {
      throw new AppError('Address not found', 400);
    }

    const pincode = address[0].azst_customer_adressbook_zip;

    const dates = await getEstimateDates(pincode);

    // Returning the expected date
    return dates.expectedDateto;
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

// Insert order info
exports.orderInfo = async (req, res, next) => {
  try {
    const { paymentData, addressId, isBillingAdsame, shippingCharge } =
      req.body;
    const orderId = req.orderId;
    const customerId = req.empId;

    if (!paymentData || !addressId || !orderId || !customerId) {
      throw new AppError('Missing required order information', 400);
    }

    const { notes = '', noteAttributes = '' } = paymentData;

    const expectedDate = await getExpectedDate(req, res, next);
    const expected = moment(expectedDate).format('YYYY-MM-DD');
    const query = `
    INSERT INTO azst_orderinfo_tbl (
      azst_orders_id,
      azst_orders_customer_id,
      azst_addressbook_id,
      azst_orderinfo_notes,
      azst_orderinfo_note_attributes,
      azst_orderinfo_shippingtype,
      azst_orderinfo_shpping_amount,
      azst_orderinfo_billing_adrs_issame,
      azst_order_exptd_delivery_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)
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
      expected,
    ];

    await dbPool.query(query, values);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
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
      azst_product_price,
      azst_product_compareat_price,
      azst_product_taxtype,
      azst_product_taxname,
      azst_product_taxvalue,
      azst_product_type,
      azst_dsc_amount,
      azst_dsc_code,
      azst_dsc_by_ids,
      product_return_accept,
      product_return_days
    ) VALUES (?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?,?,? ,?)
  `;

  const removeQuery = `DELETE FROM azst_cart_tbl WHERE azst_cart_id = ?`;

  for (let product of req.cartProducts) {
    const {
      azst_cart_id,
      azst_cart_product_id,
      azst_cart_variant_id,
      azst_cart_quantity,
      azst_cart_collection_id,
      azst_cart_product_type,
      azst_cart_dsc_amount,
      azst_cart_dsc_code,
      azst_cart_dsc_by_ids,
      price,
      product_compare_at_price,
      is_taxable,
      is_varaints_aval,
      product_return_accept,
      product_return_days,
      compare_at_price,
      offer_price,
    } = product;

    const amount = parseInt(is_varaints_aval) === 0 ? price : offer_price;
    const compareamount =
      parseInt(is_varaints_aval) === 0
        ? product_compare_at_price
        : compare_at_price;
    let azst_product_taxtype = '';
    let azst_product_taxname = '';
    let azst_product_taxvalue = '';
    if (is_taxable) {
      azst_product_taxtype = 'IGST';
      azst_product_taxname = 'GST';
      azst_product_taxvalue = '18';
    }

    const values = [
      orderId,
      azst_cart_product_id,
      azst_cart_variant_id,
      azst_cart_quantity,
      amount,
      compareamount,
      azst_product_taxtype,
      azst_product_taxname,
      azst_product_taxvalue,
      azst_cart_product_type,
      azst_cart_dsc_amount,
      azst_cart_dsc_code,
      azst_cart_dsc_by_ids,
      product_return_accept,
      product_return_days,
    ];

    const [result] = await dbPool.query(insertQuery, values);
    if (result.affectedRows > 0) {
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
    codes = discountCode;
  }

  for (let code of codes) {
    const values = [customerId, code, orderId];
    await dbPool.query(query, values);
  }
};
