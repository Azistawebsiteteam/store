const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');

const orderSchema = Joi.object({
  paymentMethod: Joi.string().valid('COD', 'RazorPay').required(), // Validate against specific values
  paymentData: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').required(),
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
  }).required(), // Ensure the object and its properties are required
  discountAmount: Joi.number().min(0).required(),
  discountCode: Joi.string().allow('').required(), // Allow an empty string
  cartList: Joi.array()
    .items(
      Joi.object({
        azst_cart_product_id: Joi.string().required(),
        azst_cart_variant_id: Joi.string().required(),
        azst_cart_quantity: Joi.number().min(1).required(),
        price: Joi.number().min(1).required(),
        azst_cart_id: Joi.string().required(),
      })
    )
    .required(), // Validate that each cart item has the correct structure
  orderSource: Joi.string().allow('').required(), // Allow an empty string
  shippingCharge: Joi.number().min(0).required(),
});

const validateOrder = catchAsync(async (req, res, next) => {
  console.log('validateOrder', req.body);
  const { error } = orderSchema.validate(req.body);
  if (error) return next(error.message, 400);
  next();
});

module.exports = validateOrder;
