const Joi = require('joi');
const AppError = require('../Utils/appError');

const reviewSchema = Joi.object({
  productId: Joi.number().required(),
  reviewContent: Joi.string().required().allow(''),
  reviewPoints: Joi.number().required().min(1).max(5),
});

const updateSchema = Joi.object({
  reviewId: Joi.number().required(),
  reviewContent: Joi.string().required().allow(''),
  reviewPoints: Joi.number().required().min(1).max(5),
});

const reviewValidation = async (req, res, next) => {
  const { productId, reviewContent, reviewPoints } = req.body;

  const { error } = reviewSchema.validate({
    productId,
    reviewContent,
    reviewPoints,
  });
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};

const updateVliadation = async (req, res, next) => {
  const { reviewId, reviewContent, reviewPoints } = req.body;

  const { error } = updateSchema.validate({
    reviewId,
    reviewContent,
    reviewPoints,
  });
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};

module.exports = { reviewValidation, updateVliadation };
