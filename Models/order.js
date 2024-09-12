const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const orderSchema = Joi.object({
  paymentMethod: Joi.string().valid('COD', 'RazorPay').required(), // Validate against specific values
  paymentData: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').required(),
    razorpay_order_id: Joi.string().allow('').required(),
    razorpay_payment_id: Joi.string().allow('').required(),
    notes: Joi.string().allow('').required(),
    noteAttributes: Joi.string().allow('').required(),
  }).required(), // Ensure the object and its properties are required
  discountAmount: Joi.number().min(0).required(),
  discountCode: Joi.string().allow('').required(), // Allow an empty string
  cartList: Joi.array()
    .items(
      Joi.object({
        azst_cart_product_id: Joi.number().required(),
        azst_cart_variant_id: Joi.number().required(),
        azst_cart_quantity: Joi.number().min(1).required(),
        price: Joi.number().min(1).required(),
        azst_cart_id: Joi.number().min(1).required(),
        product_compare_at_price: Joi.number().min(1).optional(),
        compare_at_price: Joi.number().min(1).optional(),
        offer_price: Joi.number().min(1).optional(),
        offer_percentage: Joi.number().optional(),
      })
    )
    .required(), // Validate that each cart item has the correct structure
  orderSource: Joi.string().allow('').required(), // Allow an empty string
  shippingCharge: Joi.number().min(0).required(),
  addressId: Joi.number().min(0).required(),
  isBillingAdsame: Joi.boolean().required(),
});

const validateOrder = catchAsync(async (req, res, next) => {
  const { error } = orderSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = validateOrder;
