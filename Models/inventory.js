const Joi = require('joi');
const AppError = require('../Utils/appError');

const inventorySchema = Joi.object({
  inventoryId: Joi.string().trim().min(3).max(10).required(),
  inventoryName: Joi.string().trim().min(3).max(100).required(),
  inventoryLocation: Joi.string().trim().min(3).required(), // Ensure this is the right validation for your use case
  inventoryLongitude: Joi.number().min(-180).max(180).required(),
  inventoryLatitude: Joi.number().min(-90).max(90).required(),
  inventoryAddress: Joi.string().trim().min(3).required(),
  inventoryEmail: Joi.string().trim().email().required(),
  inventoryPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Mobile Number',
    }),
  pinCode: Joi.string().max(6),
});

const inventoryValidation = async (req, res, next) => {
  const { error } = inventorySchema.validate(req.body);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};
module.exports = inventoryValidation;
