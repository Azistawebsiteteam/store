const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

// Sub-category schema validation
const subCategorySchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  subCategoryName: Joi.string().min(3).required().messages({
    'any.required': 'Please enter subCategoryName with at least 3 characters',
    'string.base': 'subCategoryName must be a string',
  }),
});

// Validate the ingredients array
const validateIng = (subCategories, schema) => {
  const parsedSubCategories = JSON.parse(subCategories);
  const validationResults = parsedSubCategories.map((subCat) =>
    schema.validate(subCat)
  );

  for (let result of validationResults) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  return parsedSubCategories; // Return parsed and validated ingredients
};

// Category schema validation
const categorySchema = Joi.object({
  categoryName: Joi.string().min(3).required(),
  categoryImg: Joi.string().optional().allow(''),
  description: Joi.string().optional().allow(''),
  subCategories: Joi.custom((value, helpers) => {
    try {
      return validateIng(value, subCategorySchema);
    } catch (error) {
      return helpers.message(error.message);
    }
  }).required(),
  categoryId: Joi.number().optional(),
  deletedSubCats: Joi.string().optional(),
});

const validateCategory = catchAsync(async (req, res, next) => {
  const { error } = categorySchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = validateCategory;
