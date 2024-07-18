const Joi = require('joi');
const AppError = require('../Utils/appError');

const loginSchema = Joi.object({
  id: Joi.number().optional(),
  title: Joi.string().min(2).max(150).required(),
  description: Joi.string().min(3).required(),
  content: Joi.string().min(3).optional(),
  product: Joi.string().min(3).required(),
  type: Joi.string().min(6).max(20).required(),
  blogImg: Joi.string().required(),
});

const blogValidation = async (req, res, next) => {
  //  const { title, description, content, product, type, blogImg } = req.body;

  const { error } = loginSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};
module.exports = blogValidation;
