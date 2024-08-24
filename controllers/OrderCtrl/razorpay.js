const Razorpay = require('razorpay');
const Joi = require('joi');
const crypto = require('crypto');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrderSchema = Joi.object({
  amount: Joi.number().min(1).required(),
  currency: Joi.string().min(1).max(5).required().valid('USD', 'EUR', 'INR'),
  receiptId: Joi.number().min(1).required(),
});

exports.razorPayCreateOrder = catchAsync(async (req, res, next) => {
  const { amount, currency, receiptId } = req.body;

  const { error } = createOrderSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const options = {
    amount: amount * 100,
    currency,
    receipt: `${receiptId}`,
    payment_capture: 1,
  };

  const response = await razorpayInstance.orders.create(options);

  res.status(200).json({
    order_id: response.id,
    currency: response.currency,
    amount: response.amount,
  });
});

const validatePaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().min(5).required(),
  razorpay_payment_id: Joi.string().min(5).required(),
  razorpay_signature: Joi.string().min(5).required(),
});

exports.razorPayValidatePayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Validate the input data
  const { error } = validatePaymentSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  // Create HMAC and validate signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Invalid payment signature.', 400));
  }

  res.status(200).json({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});

exports.rezorpayPayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await razorpayInstance.payments.fetch(paymentId);
  res.json({
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
  });
});
