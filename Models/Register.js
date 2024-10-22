const Joi = require('joi');
const AppError = require('../Utils/appError');

const registerSchema = Joi.object({
  customerFirstName: Joi.string().min(1).max(20).required().messages({
    'string.pattern.base': 'Customer FirstName is required',
  }),
  customerLastName: Joi.string().min(1).max(20).required().messages({
    'string.pattern.base': 'Customer LastName is required',
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
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/
    )
    .optional()
    .messages({
      'string.pattern.base':
        'Password must have at least 8 characters max 32, one uppercase letter, one lowercase letter, one digit, and one special character.',
    }),
  DOB: Joi.date().iso().optional().messages({
    'date.format': `Please provide a valid Date of Birth in the format 'YYYY-MM-DD'.`,
    'date.base': `The Date of Birth you entered is not valid. Please use the format 'YYYY-MM-DD'.`,
  }),
  gender: Joi.string().optional().valid('Male', 'Female'),
  wtsupNum: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid whatsApp  Number',
    }),
  notes: Joi.string().optional(),
  tags: Joi.string().optional(),
});

const userValidation = async (req, res, next) => {
  const payload = req.body;

  console.log(req.body.customerPassword);

  const { error } = registerSchema.validate(payload);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};

module.exports = userValidation;
