const { default: axios } = require('axios');
const db = require('../../dbconfig');
const Joi = require('joi');
const moment = require('moment');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

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

exports.placeOrder = catchAsync(async (req, res, next) => {
  try {
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

    // Extract customer details from userDetails
    const { user_id, user_email, user_district } = req.userDetails;

    if (
      paymentMethod === 'RazorPay' &&
      (razorpay_order_id === '' || razorpay_payment_id === '')
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
      discountCode,
      discountAmount,
      user_id,
      paymentMethod,
      paymentReference,
      orderSource,
      checkOutId,
      paymentId,
    ];

    // Execute query
    const result = await db(query, values);
    if (result.affectedRows === 0) {
      throw new Error('Failed to place order');
    }

    // Pass order ID to the next middleware
    req.orderData = orderId;
    next();
  } catch (error) {
    next(error);
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

  try {
    await db(query, values);
    next(); // Proceed to the next middleware
  } catch (error) {
    console.error('Error inserting order info:', error.message);
    next(error); // Passes the error to the global error handler
  }
});

exports.orderSummary = catchAsync(async (req, res, next) => {
  const { cartList, paymentMethod } = req.body;
  const orderId = req.orderData;

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

function generateInvoice(orderData, userDetails, cartProducts, filePath) {
  const {
    user_id,
    user_frist_name,
    user_last_name,
    user_mobile,
    user_email,
    user_hno,
    user_area,
    user_city,
    user_district,
    user_state,
    user_country,
    user_zip,
  } = userDetails;

  const doc = new PDFDocument({ margin: 50 });

  // Write the PDF to a file
  doc.pipe(fs.createWriteStream(filePath));

  // Invoice Header
  doc.fontSize(20).text('Invoice', { align: 'center' }).moveDown();

  // Order Details
  doc
    .fontSize(12)
    .text(`Order ID: ${orderData.orderId}`, { align: 'left' })
    .text(`Date: ${new Date(orderData.createdOn).toLocaleDateString()}`)
    .moveDown();

  // Customer Details
  doc
    .text(`Customer ID: ${user_frist_name} ${user_last_name}`)
    .text(`Payment Method: ${orderData.paymentMethod}`)
    .moveDown();

  // Table Header
  doc
    .fontSize(10)
    .text('Product', 50, doc.y, { width: 200 })
    .text('Quantity', 250, doc.y)
    .text('Price', 300, doc.y)
    .text('Total', 400, doc.y)
    .moveDown();

  // Products Table
  cartProducts.forEach((product) => {
    const total =
      parseInt(product.azst_cart_quantity) * parseFloat(product.price);
    doc
      .fontSize(10)
      .text(product.product_main_title, 50, doc.y, { width: 200 })
      .text(product.azst_cart_quantity, 250, doc.y)
      .text(`$${product.price}`, 300, doc.y)
      .text(`$${total.toFixed(2)}`, 400, doc.y)
      .moveDown();
  });

  // Calculations
  doc.moveDown().moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  const subTotal = orderData.subTotal.toFixed(2);
  const taxAmount = orderData.taxAmount.toFixed(2);
  const discountAmount = orderData.discountAmount.toFixed(2);
  const shippingCharge = orderData.shippingCharge.toFixed(2);
  const grandTotal = (
    parseFloat(subTotal) +
    parseFloat(taxAmount) -
    parseFloat(discountAmount) +
    parseFloat(shippingCharge)
  ).toFixed(2);

  // Summary
  doc
    .fontSize(10)
    .text(`Subtotal:`, 300, doc.y)
    .text(`$${subTotal}`, 400, doc.y)
    .moveDown();

  doc
    .text(`Tax (10%):`, 300, doc.y)
    .text(`$${taxAmount}`, 400, doc.y)
    .moveDown();

  doc
    .text(`Discount:`, 300, doc.y)
    .text(`-$${discountAmount}`, 400, doc.y)
    .moveDown();

  doc
    .text(`Shipping Charge:`, 300, doc.y)
    .text(`$${shippingCharge}`, 400, doc.y)
    .moveDown();

  doc
    .moveDown()
    .fontSize(12)
    .text(`Grand Total:`, 300, doc.y)
    .text(`$${grandTotal}`, 400, doc.y)
    .moveDown();

  const shippingAddress = {
    user_hno: '456',
    user_area: 'Rose Garden',
    user_city: 'Mumbai',
    user_district: 'Mumbai Suburban',
    user_state: 'Maharashtra',
    user_country: 'India',
    user_zip: '400001',
    user_mobile: '9876543211',
    user_email: 'user2@example.com',
  };

  // Invoice Header
  doc.fontSize(20).text('Invoice', { align: 'center' }).moveDown();

  // Left Side: Billing Address
  const startX = 50;
  const startY = doc.y;

  doc
    .fontSize(12)
    .text('Billing Address:', startX, startY)
    .text(`${user_hno}, ${user_area}, ${user_city}`, startX, doc.y)
    .text(`${user_district}, ${user_state}, ${user_country}`, startX, doc.y)
    .text(`Pincode: ${user_zip}`, startX, doc.y)
    .text(`Mobile: ${user_mobile}`, startX, doc.y)
    .text(`Email: ${user_email}`, startX, doc.y)
    .moveDown();

  // Right Side: Shipping Address
  const rightX = doc.page.width / 2 + 20; // Start position for the right side content

  doc
    .fontSize(12)
    .text('Shipping Address:', rightX, startY)
    .text(
      `${shippingAddress.user_hno}, ${shippingAddress.user_area}, ${shippingAddress.user_city}`,
      rightX,
      doc.y
    )
    .text(
      `${shippingAddress.user_district}, ${shippingAddress.user_state}, ${shippingAddress.user_country}`,
      rightX,
      doc.y
    )
    .text(`Pincode: ${shippingAddress.user_zip}`, rightX, doc.y)
    .text(`Mobile: ${shippingAddress.user_mobile}`, rightX, doc.y)
    .text(`Email: ${shippingAddress.user_email}`, rightX, doc.y)
    .moveDown();

  // Footer
  doc
    .fontSize(10)
    .text('Thank you for your purchase!', { align: 'center' })
    .moveDown();

  // Finalize the PDF and end the stream
  doc.end();
}

exports.viewInvoice = (req, res, next) => {
  const { orderId } = req.params;

  // Define the file path
  const invoiceFilePath = path.join(
    __dirname,
    '../../Uploads/invoices',
    `${orderId}.pdf`
  );

  // Check if the file exists
  if (fs.existsSync(invoiceFilePath)) {
    // Send the file for viewing in the browser
    res.sendFile(invoiceFilePath);
  } else {
    res.status(404).json({ status: 'error', message: 'Invoice not found.' });
  }
};

exports.downloadInvoice = (req, res, next) => {
  const { orderId } = req.params; // Get the orderId from the request parameters

  // Define the file path
  const invoiceFilePath = path.join(
    __dirname,
    '../../Uploads/invoices',
    `${orderId}.pdf`
  );

  // Check if the file exists
  if (fs.existsSync(invoiceFilePath)) {
    // Serve the file for download
    res.download(invoiceFilePath, `${orderId}.pdf`, (err) => {
      if (err) {
        console.error('Error in downloading the file:', err);
        res
          .status(500)
          .json({ status: 'error', message: 'Error in downloading the file.' });
      }
    });
  } else {
    res.status(404).json({ status: 'error', message: 'Invoice not found.' });
  }
};
