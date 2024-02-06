const Joi = require('joi');
const AppError = require('../../Utils/appError');

const profileSchema = Joi.object({
  firstName: Joi.string().min(3).max(20).required().messages({
    'string.pattern.base': 'Customer FirstName is required',
  }),
  lastName: Joi.string().min(3).max(20).required().messages({
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
  area: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  district: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  country: Joi.string().trim().required(),
  zipCode: Joi.number().required(),
  landmark: Joi.string().trim().allow(''),
  acceeptEmailMarketing: Joi.string().valid('true', 'false').trim(),
  company: Joi.string().trim().allow(''),
  address1: Joi.string().trim().allow(''),
  address2: Joi.string().trim().allow(''),
  marketingSmsAccept: Joi.string().valid('true', 'false').trim(),
  customerNote: Joi.string().trim().allow(''),
  taxExempts: Joi.string().valid('true', 'false').trim(),
  tags: Joi.string().trim().allow(''),
});

const profileValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = profileSchema.validate(payload);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = profileValidation;
