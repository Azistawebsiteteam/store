const Joi = require('joi');
const AppError = require('../Utils/appError');

const baseSchema = Joi.object({
  method: Joi.string().required().valid('Automatic', 'Manual'),
  title: Joi.string().min(3).max(100).required(),
  code: Joi.when('method', {
    is: 'Manual',
    then: Joi.string().alphanum().min(4).max(10).required(),
    otherwise: Joi.optional().allow(''), // No 'code' field when method is 'Automatic'
  }),
  mode: Joi.string().required().valid('amount', 'percentage'),
  value: Joi.number().required(), // Assuming value is a number. Change to string if necessary.
  applyMode: Joi.string().required().valid('collection', 'product', 'combo'),
  applyId: Joi.string().required(),
  prcValue: Joi.number().required(),
  elgCustomers: Joi.string().required(),
  usgCount: Joi.number().required(),
  startTime: Joi.date().iso().required(), // ISO 8601 format validation
  endTime: Joi.date().iso().required(), // ISO 8601 format validation
});

const discountSchema = baseSchema.keys({
  prcMode: Joi.string().required().valid('amount', 'quantity'),
  maxApplyValue: Joi.number()
    .required()
    .when('prcMode', {
      is: 'quantity',
      then: Joi.number().min(Joi.ref('prcValue')), // Fix reference to 'prcValue'
    }),
});

const xyDiscountSchema = baseSchema.keys({
  id: Joi.number().optional(),
  discountType: Joi.string().valid('percentage', 'amount', 'free').required(),
  discountValue: Joi.number().required(),
  discountApplyMode: Joi.string().valid('products', 'collections').required(),
  discountApplyTo: Joi.string().required(), // Ensure this field is required if necessary
});

const validateDiscount = async (req, res, next) => {
  const { error } = discountSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
};

const validateXYDiscount = async (req, res, next) => {
  const { error } = xyDiscountSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = { validateDiscount, validateXYDiscount };
