const Joi = require('joi');
const AppError = require('../Utils/appError');

const inventorySchema = Joi.object({
  inventoryId: Joi.string().trim().min(3).max(10).required(),
  inventoryName: Joi.string().trim().min(3).max(100).required(),
  inventoryLocation: Joi.string().trim().min(3).required(),
  inventoryLongitude: Joi.string().trim().min(6).max(15).required(),
  inventoryLatitude: Joi.string().trim().min(6).max(12).required(),
  inventoryAddress: Joi.string().trim().min(3).required(),
  inventoryEmail: Joi.string().trim().email().required(),
  inventoryPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
});

const inventoryValidation = async (req, res, next) => {
  const payload = req.body;

  const { error } = inventorySchema.validate(req.body);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};
module.exports = inventoryValidation;
