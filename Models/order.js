const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const orderSchema = Joi.object({
  paymentMethod: Joi.string().valid('COD', 'RazorPay').required(),
  paymentData: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').required(),
    razorpay_order_id: Joi.string().allow('').required(),
    razorpay_payment_id: Joi.string().allow('').required(),
    notes: Joi.string().allow('').required(),
    noteAttributes: Joi.string().allow('').required(),
  }).required(),

  discountAmount: Joi.number().min(0).required(),
  discountCode: Joi.array().items(Joi.string()).required(),

  cartList: Joi.array()
    .items(
      Joi.object({
        azst_cart_product_id: Joi.number().required(),
        azst_cart_variant_id: Joi.number().required(),
        azst_cart_quantity: Joi.number().min(1).required(),
        is_varaints_aval: Joi.number().min(0).max(1).required(),
        azst_cart_id: Joi.number().min(1).required(),
        // These fields should be optional when 'is_varaints_aval' is 0, and required when it's 1
        price: Joi.alternatives().conditional('is_varaints_aval', {
          is: 0,
          then: Joi.number().min(1).required(),
          otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
        }),

        product_compare_at_price: Joi.alternatives().conditional(
          'is_varaints_aval',
          {
            is: 0,
            then: Joi.number().min(1).required(),
            otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
          }
        ),

        // These fields should be optional when 'is_varaints_aval' is 0, and required when it's 1
        compare_at_price: Joi.alternatives().conditional('is_varaints_aval', {
          is: 1,
          then: Joi.number().min(1).required(),
          otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
        }),

        offer_price: Joi.alternatives().conditional('is_varaints_aval', {
          is: 1,
          then: Joi.number().min(1).required(),
          otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
        }),
      })
    )
    .required(),

  orderSource: Joi.string().allow('').required(),
  shippingCharge: Joi.number().min(0).required(),
  addressId: Joi.number().min(0).required(),
  isBillingAdsame: Joi.boolean().required(),
});

// Validation middleware
const validateOrder = catchAsync(async (req, res, next) => {
  const { error } = orderSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return next(new AppError(error.message, 400));
  }

  next();
});

module.exports = validateOrder;
