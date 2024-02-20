const Joi = require('joi');
const AppError = require('../Utils/appError');

const resetSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/
    )
    .required()
    .messages({
      'string.pattern.base':
        'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character.',
    }),
});

const passwordValidation = async (req, res, next) => {
  const payload = req.body;
  const { error } = resetSchema.validate(payload);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};
module.exports = passwordValidation;
