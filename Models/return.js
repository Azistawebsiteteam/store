const Joi = require('joi');
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsync');

// Schema for bank transfer details
const bankTransferSchema = Joi.object({
  bankAcNo: Joi.string()
    .pattern(/^\d{10,18}$/)
    .required()
    .messages({
      'string.pattern.base':
        'Bank account number must be a string of 5 to 18 digits.',
    }),
  ifscCode: Joi.string()
    .required()
    .regex(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
    .messages({
      'string.pattern.base': 'Invalid IFSC Code',
    }),
  branch: Joi.string().min(3).max(25).required(),
  bankName: Joi.string().min(3).max(50).required(),
  acName: Joi.string().min(3).max(100).required(),
  bankFile: Joi.object()
    .optional()
    .allow('', null)
    .messages({ 'any.required': 'Bank file is required as an image file' }),
});

// Joi validation schema for the refund request
const refundSchema = Joi.object({
  orderId: Joi.string().min(10).max(18).required(),
  reason: Joi.string().min(5).max(500).required(),
  refundMethod: Joi.string()
    .valid('Same Payment Method', 'Bank Transfer')
    .required(),
  bankTransferDetails: Joi.when('refundMethod', {
    is: 'Bank Transfer',
    then: bankTransferSchema.required(),
    otherwise: Joi.optional(),
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
  const { error } = refundSchema.validate(req.body, { abortEarly: false });
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
