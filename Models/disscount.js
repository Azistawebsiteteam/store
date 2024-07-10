const Joi = require('joi');

const AppError = require('../Utils/appError');

const discountSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  code: Joi.string().alphanum().min(4).max(10).required(),
  mode: Joi.string().required().valid('amount', 'percentage'),
  value: Joi.number().required(), // Assuming value is a number. Change to string if necessary.
  applyMode: Joi.string().required().valid('collection', 'product', 'combo'),
  applyId: Joi.string().required(),
  prcMode: Joi.string().required().valid('amount', 'quantity'),
  prcValue: Joi.number().required(),
  elgCustomers: Joi.string().required(),
  maxApplyValue: Joi.number()
    .required()
    .when('prcMode', {
      is: 'quantity',
      then: Joi.number().min(Joi.ref('prcAmt')),
    }),
  usgCount: Joi.number().required(),
  startTime: Joi.date().iso().required(), // ISO 8601 format validation
  endTime: Joi.date().iso().required(), // ISO 8601 format validation
});

//  maxApplyQty: Joi.number().required(),

const validateDiscount = async (req, res, next) => {
  const { error } = discountSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = { validateDiscount };
