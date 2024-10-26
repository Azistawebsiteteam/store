const Joi = require('joi');
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsync');

// Joi validation schema for the refund request
const refundSchema = Joi.object({
  orderId: Joi.string().min(10).max(18).required(),
  reason: Joi.string().min(5).max(250).required(),
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

const refundUpdateSchema = Joi.object({
  retunId: Joi.number().required(),
  comments: Joi.string().optional().max(250).allow(''),
  returnStatus: Joi.string().required().valid('Approved', 'Rejected'),
});

// Main controller function to handle order return and refund
const returnValidation = catchAsync(async (req, res, next) => {
  // Validate the request body using Joi schema
  const { error } = refundSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

const statusUpdateValidation = catchAsync(async (req, res, next) => {
  // Validate the request body using Joi schema
  const { error } = refundUpdateSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = { returnValidation, statusUpdateValidation };
