const moment = require('moment');
const db = require('../../Database/dbconfig');
const sharp = require('sharp');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const razorpayInstance = require('../../Utils/razorpay');

const multerInstance = require('../../Utils/multer');

// Middleware to check if the order has been delivered
exports.isOrderDelivered = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;
  if (!orderId) return next(new AppError('orderId Required', 400));
  const query = `
    SELECT azst_orders_total, azst_orders_payment_method, 
           azst_orders_payment_id, azst_orders_delivery_status, azst_orders_delivery_on
    FROM azst_orders_tbl 
    WHERE azst_orders_id = ?
  `;

  // Use parameterized queries to prevent SQL injection
  const [order] = await db(query, [orderId]);

  // Check if the order exists and has been delivered
  if (!order || parseInt(order.azst_orders_delivery_status) === 0) {
    return next(new AppError('Cannot return the order before delivery', 400));
  }

  // Attach the order details to the request object for use in the next middleware
  req.orderDetails = order;
  next();
});

// Helper function to initiate refund using Razorpay
exports.initiateRefund = async (paymentId, amount) => {
  try {
    const refundData = await razorpayInstance.payments.refund(paymentId, {
      amount: amount * 100, // Convert amount to paise (1 INR = 100 paise)
    });
    return refundData;
  } catch (err) {
    throw new Error(err?.error?.description || 'Refund initiation failed', 400);
  }
};

exports.getRefundStatus = async (refundId) => {
  try {
    const refundStatus = await razorpayInstance.refunds.fetch(refundId);
    return refundStatus;
  } catch (err) {
    throw new Error(err?.error?.description || 'Failed to fetch refund status');
  }
};

exports.uploadImage = multerInstance.single('bankFile');

// Main controller function to handle order return and refund
exports.returnOrder = catchAsync(async (req, res, next) => {
  const { orderId, reason, refundMethod, bankTransferDetails = {} } = req.body;
  const {
    bankAcNo = '',
    ifscCode = '',
    branch = '',
    bankName = '',
    acName = '',
  } = bankTransferDetails;
  const returnBy = req.empId; // Employee ID initiating the return
  const { user_mobile } = req.userDetails; // Mobile number of the user (customer)
  const imageName = req.file
    ? `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`
    : null;

  const {
    azst_orders_total,
    azst_orders_payment_method,
    azst_orders_payment_id,
  } = req.orderDetails;

  // Check if a return has already been initiated for this order
  const existingReturnQuery = `SELECT return_id FROM azst_order_returns WHERE order_id = ?`;
  const [existingReturn] = await db(existingReturnQuery, [orderId]);

  if (existingReturn) {
    return next(new AppError('Return Initiate Already', 400));
  }

  // Validate payment method compatibility with refund method
  if (
    azst_orders_payment_method === 'COD' &&
    refundMethod === 'Same Payment Method'
  ) {
    return next(
      new AppError('The order is paid with COD, so choose Bank Transfer', 400)
    );
  }

  // Prepare the insertion query and values
  const insertReturnQuery = `
    INSERT INTO azst_order_returns 
    (order_id, customer_id, return_reason, refund_method, bank_account_num, ifsc_code, 
    bank_branch, bank_name, ac_holder_name, bank_file, payment_id, refund_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const returnValues = [
    orderId,
    returnBy,
    reason,
    refundMethod,
    bankAcNo,
    ifscCode,
    branch,
    bankName,
    acName,
    imageName,
    azst_orders_payment_id,
    azst_orders_total,
  ];

  // Execute the insertion query
  const insertResult = await db(insertReturnQuery, returnValues);

  if (insertResult.affectedRows > 0) {
    // Save the uploaded file if present
    if (imageName) {
      await sharp(req.file.buffer).toFile(`Uploads/AccountFiles/${imageName}`);
    }

    // Send SMS notification to the customer

    const smsService = new Sms(returnBy, user_mobile);
    await smsService.refundRequest(orderId);

    return res.status(200).json({ message: 'Refund initiated successfully' });
  } else {
    return res.status(400).json({ message: 'Failed to Return try again' });
  }
});

exports.getMyRefunRequestList = catchAsync(async (req, res, next) => {
  const query = `SELECT * FROM azst_order_returns WHERE customer_id = ?`;
  const result = await db(query, [req.empId]);
  res.status(200).json(result);
});

exports.getRefunRequestList = catchAsync(async (req, res, next) => {
  const query = `SELECT * FROM azst_order_returns WHERE admin_approval = 'Pending'`;
  const result = await db(query);
  res.status(200).json(result);
});

const sendSmsToCustomer = async (returnId, returnStatus) => {
  const query = `SELECT order_id, customer_id FROM azst_order_returns  WHERE return_id = ? `;
  const [customer] = await db(query, [returnId]);

  if (customer) {
    const smsService = new Sms(customer.customer_id, null);
    await smsService.getUserDetails();
    if (returnStatus === 'Approved') {
      await smsService.refundInitiate(customer.order_id);
    } else if (returnStatus === 'Refunded') {
      await smsService.paymentRefunded(customer.order_id);
    } else {
      await smsService.refundRejected(customer.order_id);
    }
  }
};

exports.updateRefundStatus = catchAsync(async (req, res, next) => {
  const { returnId, returnStatus, comments } = req.body;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  // Prepare base query and values
  let query = `
    UPDATE azst_order_returns 
    SET admin_approval = ?, admin_comments = ?, admin_id = ?, approval_action_on = ?
  `;
  const values = [returnStatus, comments, req.empId, today];

  // Append processing status if approved
  if (returnStatus === 'Approved') {
    query += ', processing_status = ?';
    values.push('Processing');
  }

  // Add condition and finalize query
  query += ' WHERE return_id = ?';
  values.push(returnId);

  // Execute the update query
  const result = await db(query, values);

  if (result.affectedRows > 0) {
    await sendSmsToCustomer(returnId, returnStatus); // Send SMS notification to the customer
    return res
      .status(200)
      .json({ message: `Refund ${returnStatus} successfully` });
  }

  res.status(400).json({ message: 'Oops! Something went wrong' });
});

exports.initiateRefundAdmin = catchAsync(async (req, res, next) => {
  const { returnId } = req.body;

  if (!returnId) return next(new AppError('Refund ID is required', 400));

  // Retrieve refund data from the database
  const getRefundQuery = `
    SELECT payment_id, refund_amount
    FROM azst_order_returns
    WHERE return_id = ? AND admin_approval = 'Approved' AND Status = 1
  `;
  const [refundData] = await db(getRefundQuery, [returnId]);

  if (!refundData) return next(new AppError('No refund request found', 404));

  const { payment_id, refund_amount } = refundData;
  let trackId = null;

  // Attempt to initiate the refund through an external function
  try {
    const refundDetails = await exports.initiateRefund(
      payment_id,
      refund_amount
    );
    trackId = refundDetails.id;
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // Prepare update query and values
  const updateQuery = `
    UPDATE azst_order_returns
    SET refund_initiate_by = ?, refund_initiate_on = ?, refund_track_id = ?, processing_status = ?
    WHERE return_id = ?
  `;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [req.empId, today, trackId, 'Refunded', returnId];

  // Execute the update query
  const result = await db(updateQuery, values);

  if (result.affectedRows > 0) {
    await sendSmsToCustomer(returnId, 'Refunded'); // Send SMS notification to the customer
    return res.status(200).json({ message: 'Payment refunded successfully' });
  }

  res.status(400).json({ message: 'Oops! Something went wrong' });
});

// exports.updateRefundStatus = catchAsync(async (req, res, next) => {
//   const { retunId, returnStatus, comments } = req.body;

//   let processing_query = '';
//   const today = moment().format('YYYY-MM-DD HH:mm:ss');

//   const values = [returnStatus, comments, req.empId, today];

//   if (returnStatus === 'Approved') {
//     processing_query = ', processing_status = ?';
//     values.push('Processing');
//   }

//   values.push(retunId);

//   const query = `UPDATE azst_order_returns SET admin_approval = ? ,
//                         admin_comments = ? ,admin_id = ? ,approval_action_on = ?  ${processing_query}
//                   WHERE return_id = ?`;

//   const result = await db(query, values);

//   if (result.affectedRows > 0) {
//     sendSmsToCustomer(retunId, returnStatus);
//     res.status(200).json({ message: `Refund ${returnStatus} successfully` });
//     return;
//   }

//   res.status(400).json({ message: 'opps! something went wrong' });
// });

// exports.initiateRefundAdmin = catchAsync(async (req, res, next) => {
//   const { retunId } = req.body;
//   if (!retunId) return next(new AppError('Refund Id  is required', 400));

//   const getRefundQuery = ` SELECT payment_id, refund_amount
//                             FROM azst_order_returns
//                             WHERE return_id = ? AND admin_approval = 'Approved' AND Status = 1 `;

//   const [refundData] = await db(getRefundQuery, [retunId]);

//   if (!refundData) return next(new AppError('no Refund request found', 404));

//   const { payment_id, refund_amount } = refundData;
//   let trackId = null;
//   try {
//     const refundDetails = await exports.initiateRefund(
//       payment_id,
//       refund_amount
//     );
//     trackId = refundDetails.id;
//   } catch (error) {
//     return next(new AppError(error.message, 400));
//   }

//   const query = `UPDATE azst_order_returns
//                   SET refund_initiate_by = ? ,refund_initiate_on = ? refund_track_id = ? ,processing_status = ?
//                   WHERE return_id = ?`;

//   const today = moment().format('YYYY-MM-DD HH:mm:ss');
//   const values = [req.empId, today, trackId, 'Refunded', retunId];

//   const result = await db(query, values);

//   if (result.affectedRows > 0) {
//     sendSmsToCustomer(retunId, 'Refunded');
//     res.status(200).json({ message: `Payment Refunded  successfully` });
//     return;
//   }

//   res.status(400).json({ message: 'opps! something went wrong' });
// });

//'Approved', 'Rejected''Pending', 'Processing', 'Refunded'

// Initiate refund if using the same payment method (not Bank Transfer)
// if (refundMethod === 'Same Payment Method') {
//   try {
//     refundTrackId = await initiateRefund(
//       azst_orders_payment_id,
//       azst_orders_total
//     );
//   } catch (error) {
//     return next(new AppError('Refund initiation failed', 400));
//   }
// }
// return_id,
// order_id,
// customer_id,
// return_reason,
// return_date,
// refund_method,
// bank_account_num,
// ifsc_code,
// bank_branch,
// bank_name,
// ac__holder_name,
// bank_file,
// payment_id,
// refund_amount,
//   refund_track_id,
//   admin_approval,
//   admin_id,
//   approval_action_on,
// refund_initiate_by,
// refund_initiate_on,
// processing_status,
// admin_comments,
//   last_updated;
