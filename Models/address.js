const Joi = require('joi');
const AppError = require('../Utils/appError');

const addressSchema = Joi.object({
  addressId: Joi.number().allow('').optional(),
  customerFirstName: Joi.string().min(1).max(25).required().messages({
    'string.pattern.base': 'Customer FirstName is required',
  }),
  customerLastName: Joi.string().min(1).max(25).messages({
    'string.pattern.base': 'Customer LastName is required',
  }),
  customerMobileNum: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  customerEmail: Joi.string().trim().email().required(),
  housenumber: Joi.string().allow('').optional(),
  district: Joi.string().min(2).max(20).required(),
  state: Joi.string().min(2).max(20).required(),
  country: Joi.string().min(2).max(10).valid('India'),
  zipCode: Joi.number().integer().min(100000).max(999999), // Zip code as number and length as 6
  landmark: Joi.string().min(3).optional().allow(''),
  homeOrCompany: Joi.string().valid('Home', 'Company'),
  address1: Joi.string().min(5),
  address2: Joi.string().min(5).allow('').optional(), // address2 is not required, so allow an empty string
  availableFromTime: Joi.string().allow('').optional(),
  availableToTime: Joi.string().allow('').optional(),
  isDefault: Joi.boolean().optional(),
});

// area: Joi.string().min(3).max(20).required(),
// city: Joi.string().min(3).max(20).required(),

const addressValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = addressSchema.validate(payload);
  if (error) return next(new AppError(error.message, 400));
  next();
};

module.exports = addressValidation;
