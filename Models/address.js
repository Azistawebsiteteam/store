const Joi = require('joi');
const AppError = require('../Utils/appError');

const addressSchema = Joi.object({
  addressId: Joi.number().allow(''),
  customerFirstName: Joi.string().min(3).max(20).required().messages({
    'string.pattern.base': 'Customer FirstName is required',
  }),
  customerLastName: Joi.string().min(3).max(20).messages({
    'string.pattern.base': 'Customer LastName is required',
  }),
  customerMobileNum: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  customerEmail: Joi.string().trim().email().required(),
  housenumber: Joi.string().allow(''),
  area: Joi.string().min(3).max(20).required(),
  city: Joi.string().min(3).max(20).required(),
  district: Joi.string().min(3).max(20).required(),
  state: Joi.string().min(3).max(20).required(),
  country: Joi.string().min(3).max(20).required(),
  zipCode: Joi.number().integer().min(100000).max(999999), // Zip code as number and length as 6
  landmark: Joi.string().min(3),
  homeOrCompany: Joi.string().min(3).max(20).valid('Home', 'Company'),
  address1: Joi.string().min(5),
  address2: Joi.string().min(5).allow(''), // address2 is not required, so allow an empty string
  avalableTime: Joi.string().min(5).allow(''),
  isDefault: Joi.boolean(),
});

const addressValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = addressSchema.validate(payload);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = addressValidation;
