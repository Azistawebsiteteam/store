const Joi = require('joi');
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsync');

const loginSchema = Joi.object({
  password: Joi.string().min(8).max(32).required(),
  mailOrMobile: Joi.string().min(2).required(),
});

const loginValidation = catchAsync(async (req, res, next) => {
  const payload = req.body;

  const { error } = loginSchema.validate(payload);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
});
module.exports = loginValidation;
