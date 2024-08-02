const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const baseSchame = Joi.object({
  name: Joi.string().min(3).required(),
  mobileNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  email: Joi.string().trim().email().required(),
  customerId: Joi.number().optional().allow(''),
});

const callbackSchema = baseSchame.keys({
  orgName: Joi.string().min(3).required(),
  budget: Joi.number().min(1),
  requestQty: Joi.number().min(1),
  purposeOfPurchase: Joi.string().required(),
  expetedDeliveryDate: Joi.date().iso().required(),
});

const querySchema = baseSchame.keys({
  message: Joi.string().min(5).required(),
});

const vallidateCallback = catchAsync(async (req, res, next) => {
  const { error } = callbackSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

const validateQuery = catchAsync(async (req, res, next) => {
  const { error } = querySchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = { vallidateCallback, validateQuery };
