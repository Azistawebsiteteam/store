const Joi = require('joi');
const crypto = require('crypto');

const razorpayInstance = require('../../Utils/razorpay');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');

const createOrderSchema = Joi.object({
  amount: Joi.number().min(1).required(),
  currency: Joi.string().min(1).max(5).required().valid('USD', 'EUR', 'INR'),
});

exports.razorPayCreateOrder = catchAsync(async (req, res, next) => {
  const { amount, currency } = req.body;
  const receiptId = req.empId;

  const { error } = createOrderSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const options = {
    amount: amount * 100,
    currency,
    receipt: `${receiptId}`,
    payment_capture: 1,
  };

  try {
    response = await razorpayInstance.orders.create(options);
    return res.status(200).json({
      order_id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (err) {
    return next(
      new AppError(`RazorPay ${err.error.description}`, err.statusCode)
    );
  }
});

const validatePaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().min(5).required(),
  razorpay_payment_id: Joi.string().min(5).required(),
  razorpay_signature: Joi.string().min(5).required(),
});

exports.razorPayValidatePayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const { user_mobile } = req.userDetails;

  // Validate the input data
  const { error } = validatePaymentSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  // Create HMAC and validate signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const smsSevices = new Sms(null, user_mobile);
  if (generatedSignature !== razorpay_signature) {
    await smsSevices.paymentFail(
      `${razorpay_order_id} And PaymentId ${razorpay_payment_id}`
    );
    return next(new AppError('Invalid payment signature.', 400));
  }

  await smsSevices.paymentConfirm(
    `${razorpay_order_id} And PaymentId ${razorpay_payment_id}`
  );

  res.status(200).json({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});

exports.rezorpaymentRefund = catchAsync(async (req, res, next) => {
  const { paymentId, amount, receipt, reason } = req.body;
  try {
    const refundData = await razorpayInstance.payments.refund(paymentId, {
      amount: parseInt(amount) * 100, // Convert amount to paise (1 INR = 100 paise)
      receipt,
      notes: {
        reason,
      },
    });
    res.status(200).json({ refundData });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: 'error',
      message: err?.error?.description || 'Refund initiation failed',
    });
  }
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
