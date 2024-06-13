const Joi = require('joi');
const AppError = require('../Utils/appError');

const reviewSchema = Joi.object({
  productId: Joi.number().required(),
  reviewTitle: Joi.string().min(10).required(),
  reviewContent: Joi.string().min(10).required(),
  reviewPoints: Joi.number().required().min(1).max(5),
});

const updateSchema = reviewSchema.keys({
  reviewId: Joi.number().required(),
  productId: Joi.number().optional(),
});

const reviewValidation = async (req, res, next) => {
  const { productId, reviewContent, reviewTitle, reviewPoints } = req.body;

  const { error } = reviewSchema.validate({
    productId,
    reviewContent,
    reviewTitle,
    reviewPoints,
  });
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};

const updateVliadation = async (req, res, next) => {
  const { reviewId, reviewContent, reviewTitle, reviewPoints } = req.body;

  const { error } = updateSchema.validate({
    reviewId,
    reviewContent,
    reviewTitle,
    reviewPoints,
  });
  if (error) {
    return next(new AppError(error.message, 400));
  } else {
    next();
  }
};

module.exports = { reviewValidation, updateVliadation };
