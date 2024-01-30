const Joi = require('joi');
const AppError = require('../../Utils/appError');

const registerSchema = Joi.object({
  customerName: Joi.string().min(3).max(20).required().messages({
    'string.pattern.base': 'Customer Name is required',
  }),
  customerMobileNum: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  customerEmail: Joi.string().trim().email().required(),
  customerPassword: Joi.string()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/
    )
    .required()
    .messages({
      'string.pattern.base':
        'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character.',
    }),
  customerHouseNo: Joi.string().min(3).max(20).required(),
  customerArea: Joi.string().min(3).max(20).required(),
  customerCity: Joi.string().min(3).max(20).required(),
  customerDistrict: Joi.string().min(3).max(20).required(),
  customerState: Joi.string().min(3).max(20).required(),
  customerCountry: Joi.string().min(3).max(20).required(),
  customerLandmark: Joi.string().min(3).max(20).required(),
});

const userValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = registerSchema.validate(payload);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};
module.exports = userValidation;
