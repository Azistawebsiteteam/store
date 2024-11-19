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
    notes: Joi.string().allow('').optional(),
    noteAttributes: Joi.string().allow('').optional(),
  }).required(),

  discountAmount: Joi.number().min(0).required(),
  discountCode: Joi.array().items(Joi.string()).required(),
  cartList: Joi.array()
    .items(Joi.number().min(1).required())
    .min(1)
    .required()
    .messages({
      'array.min': 'Add at least one product to cart', // Custom message for the array minimum length validation
      'array.includesRequiredUnknowns': 'Add at least one product to cart', // Custom message when required items are missing
      'any.required': 'cartList is Reuired', // Custom message if the field is entirely missing
    }),
  orderSource: Joi.string().allow('').required(),
  shippingCharge: Joi.number().min(0).required(),
  addressId: Joi.number().min(0).required(),
  isBillingAdsame: Joi.boolean().required(),
});

// cartList: Joi.array()
//   .items(
//     Joi.object({
//       azst_cart_product_id: Joi.number().required(),
//       azst_cart_variant_id: Joi.number().required(),
//       azst_cart_quantity: Joi.number().min(1).required(),
//       is_varaints_aval: Joi.number().min(0).max(1).required(),
//       azst_cart_id: Joi.number().min(1).required(),
//       // These fields should be optional when 'is_varaints_aval' is 0, and required when it's 1
//       price: Joi.alternatives().conditional('is_varaints_aval', {
//         is: 0,
//         then: Joi.number().min(1).required(),
//         otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
//       }),

//       product_compare_at_price: Joi.alternatives().conditional(
//         'is_varaints_aval',
//         {
//           is: 0,
//           then: Joi.number().min(1).required(),
//           otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
//         }
//       ),

//       // These fields should be optional when 'is_varaints_aval' is 0, and required when it's 1
//       compare_at_price: Joi.alternatives().conditional('is_varaints_aval', {
//         is: 1,
//         then: Joi.number().min(1).required(),
//         otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
//       }),

//       offer_price: Joi.alternatives().conditional('is_varaints_aval', {
//         is: 1,
//         then: Joi.number().min(1).required(),
//         otherwise: Joi.any().optional().allow(null), // Allows null or any value when 'is_varaints_aval' is 0
//       }),
//     })
//   )
//   .required(),

// Validation middleware
const validateOrder = catchAsync(async (req, res, next) => {
  const { error } = orderSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return next(new AppError(error.message, 400));
  }

  next();
});

module.exports = validateOrder;
