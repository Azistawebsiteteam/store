const Joi = require('joi');
const AppError = require('../Utils/appError');

const profileSchema = Joi.object({
  firstName: Joi.string().min(2).max(20).required().messages({
    'string.pattern.base': 'Customer FirstName is required',
  }),
  lastName: Joi.string().min(2).max(20).required().messages({
    'string.pattern.base': 'Customer LastName is required',
  }),
  mobileNum: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  email: Joi.string().trim().email().required(),
  houseNumber: Joi.string().trim().required(),
  district: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  country: Joi.string().trim().required(),
  zipCode: Joi.number().required(),
  landmark: Joi.string().trim().allow(''),
  acceeptEmailMarketing: Joi.boolean(),
  company: Joi.string().trim().allow(''),
  address1: Joi.string().trim().allow(''),
  address2: Joi.string().trim().allow(''),
  marketingSmsAccept: Joi.boolean(),
  gender: Joi.string().required(),
  dob: Joi.date().iso().required().messages({
    'date.format': `Please provide a valid Date of Birth in the format 'YYYY-MM-DD'.`,
    'date.base': `The Date of Birth you entered is not valid. Please use the format 'YYYY-MM-DD'.`,
  }),
});

const profileValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = profileSchema.validate(payload);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = profileValidation;
