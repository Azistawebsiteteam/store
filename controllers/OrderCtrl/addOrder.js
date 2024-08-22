const { default: axios } = require('axios');
const db = require('../../dbconfig');
const Joi = require('joi');
const moment = require('moment');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Razorpay = require('razorpay');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const { concurrency } = require('sharp');

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

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.razorPayCreateOrder = catchAsync(async (req, res, next) => {
  const { amount, currency } = req.body;

  const options = {
    amount,
    currency,
    receipt: 'receipt',
    payment_capture: 1,
  };
  try {
    const response = await razorpayInstance.orders.create(options);

    res.status(200).json({
      order_id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    console.error(error);
  }
});

exports.rezorpayPayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;

  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);

    res.json({
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    console.log(error);
  }
});

exports.addedOrder = catchAsync(async (req, res, next) => {
  const { paymentMethod, cartProducts, addressId } = req.body;
  const customerId = req.empId;
  const userDetails = req.userDetails;

  // Generate a unique order ID
  const orderId = generateOrderId();

  // Calculate the subtotal and tax amount
  const { subTotal, taxAmount } = getCartTotal(cartProducts);
  // console.log(subTotal, taxAmount);

  // Assume discount and shipping charge
  const discountAmount = 10; // For example, $10 discount
  const shippingCharge = 15; // For example, $15 shipping charge

  // Prepare order data
  const orderData = {
    orderId,
    customerId,
    subTotal,
    taxAmount,
    discountAmount,
    shippingCharge,
    paymentMethod,
    createdOn: new Date(),
  };

  // // Save order data to the database
  // await db.azst_orders_tbl.create(orderData);
  // Save cart products data to the database...
  // const folder = `Uploads/invoices/`;
  // Define the path for the uploads/invoices directory
  const invoicesDir = path.join(__dirname, '../../Uploads/invoices');

  // Ensure the uploads/invoices directory exists
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true }); // Create the directory if it doesn't exist
  }

  // Define the file path for the invoice
  const invoiceFilePath = path.join(invoicesDir, `${orderId}.pdf`);

  generateInvoice(orderData, userDetails, cartProducts, invoiceFilePath);

  res.status(201).json({
    status: 'success',
    data: {
      orderId,
      subTotal,
      taxAmount,
      total: subTotal + taxAmount,
    },
  });
});

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

// exports.addedOrder = catchAsync(async (req, res, next) => {
//   const { paymentMethod, cartProduct, addressId } = req.body;
//   const orderId = generateOrderId();
//   const { subTotal, taxeAmount } = getCartTotal(cartProducts);
//   if (paymentMethod === 'COD') {
//     // generate invoice pdf and store in table
//     // in this in tables
//   }
// });

// ** azst_orderinfo_tbl **

//   azst_orderinfo_id,
//   azst_orders_id,
//   azst_orders_customer_id,
//   azst_addressbook_id,
//   azst_orderinfo_notes,
//   azst_orderinfo_note_attributes,
//   azst_orderinfo_created_on,
//   azst_orderinfo_shippingtype,
//   azst_orderinfo_shpping_amount,
//   azst_orderinfo_billing_adrs_issame;

// ** azst_orders_tbl ** contains

// it store about order amount financial information

// azst_orders_tbl_id,
//   azst_orders_id,
//   azst_orders_email,
//   azst_orders_financial_status,
//   azst_orders_paid_on,
//   azst_orders_fulfillment_status,
//   azst_orders_fulfilled_on,
//   azst_orders_currency,
//   azst_orders_shipping,
//   azst_orders_subtotal,
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

// ** azst_ordersummary_tbl **
// it  store the details of order who many products are in order and quantity and price , method of payment
// azst_ordersummary_id,
//   azst_orders_id,
//   azst_order_product_id,
//   azst_order_variant_id,
//   azst_order_qty,
//   azst_order_delivery_method,
//   azst_product_price;
