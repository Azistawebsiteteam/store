const Joi = require('joi');
const db = require('../../Database/dbconfig');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const razorpayInstance = require('../../Utils/razorpay');

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
const initiateRefund = async (paymentId, amount) => {
  try {
    const refundData = await razorpayInstance.payments.refund(paymentId, {
      amount: amount * 100, // Convert amount to paise (1 INR = 100 paise)
    });
    return refundData;
  } catch (err) {
    throw new Error(err?.error?.description || 'Refund initiation failed', 400);
  }
};

// Joi validation schema for the refund request
const refundSchema = Joi.object({
  orderId: Joi.string().min(10).max(18).required(),
  reason: Joi.string().min(5).max(500).required(),
  refundMethod: Joi.string()
    .valid('Same Payment Method', 'Bank Transfer')
    .required(),
  bankAc: Joi.number().when('refundMethod', {
    is: 'Bank Transfer',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null),
  }),
  ifscCode: Joi.string().when('refundMethod', {
    is: 'Bank Transfer',
    then: Joi.string()
      .required()
      .regex(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
      .messages({
        'string.pattern.base': 'Invalid IFSC Code',
      }),
    otherwise: Joi.optional().allow('', null),
  }),
});

// Main controller function to handle order return and refund
exports.returnOrder = catchAsync(async (req, res, next) => {
  // Validate the request body using Joi schema
  const { error } = refundSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  // Check if the order is delivered

  // await exports.isOrderDelivered(req, res, next);

  const { orderId, reason, refundMethod, bankAc, ifscCode } = req.body;
  const returnBy = req.empId; // Employee ID initiating the return
  const { user_mobile } = req.userDetails; // Mobile number of the user (customer)

  const {
    azst_orders_total,
    azst_orders_payment_method,
    azst_orders_payment_id,
  } = req.orderDetails;

  // If the payment method is COD and refund method is "Same Payment Method"
  if (
    azst_orders_payment_method === 'COD' &&
    refundMethod === 'Same Payment Method'
  ) {
    return next(
      new AppError('The order is paid with COD, so choose Bank Transfer', 400)
    );
  }

  // Insert return details into the database
  const query = `
    INSERT INTO azst_order_returns 
    (order_id, customer_id, return_reason, refund_method,bank_account, ifsc_code, refund_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    orderId,
    returnBy,
    reason,
    refundMethod,
    bankAc,
    ifscCode,
    azst_orders_total,
  ];

  // Insert the return details into the database
  const result = await db(query, values);

  // Send response based on whether the return insertion was successful
  if (result.affectedRows > 0) {
    const smsService = new Sms(returnBy, user_mobile);
    await smsService.refundRequest(orderId); // Send SMS notification to the customer
    res.status(200).json({ message: 'Refund initiated successfully' });
  } else {
    res.status(500).json({ message: 'Oops, something went wrong' });
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

const sendSmsToCustomer = async (returnId) => {
  const query = `SELECT order_id, customer_id FROM azst_order_returns  WHERE return_id = ? `;
  const [customer] = await db(query, [returnId]);

  if (customer) {
    const smsService = new Sms(customer.customer_id, null);
    await smsService.getUserDetails();
    await smsService.refundInitiate(customer.order_id);
  }
};

exports.updateRefundStatus = catchAsync(async (req, res, next) => {
  const { retunId, returnStatus, comments } = req.body;

  let processing_query = '';

  const values = [returnStatus, comments, req.empId];

  if (returnStatus === 'Approved') {
    processing_query = ', processing_status = ?';
    values.push('Processing');
  }

  values.push(retunId);

  const query = `UPDATE azst_order_returns SET admin_approval = ? , 
                        admin_comments = ? ,admin_id = ? ${processing_query}
                  WHERE return_id = ?`;

  const result = await db(query, values);

  if (result.affectedRows > 0) {
    if (returnStatus === 'Approved') {
      sendSmsToCustomer(retunId);
    }
    res.status(200).json({ message: `Refund ${returnStatus}d successfully` });
    return;
  }

  res.status(400).json({ message: 'opps! something went wrong' });
});

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
//   order_id,
//     customer_id,
//     return_reason,
//     return_date,
//     admin_approval,
//     admin_id,
//     refund_method,
//     bank_account,
//     ifsc_code,
//     refund_amount,
//     refun_track_id,
//     processing_status,
//     admin_comments,
//     last_updated;
