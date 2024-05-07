const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

// Define a reusable function to validate JSON array format
const validateJSONArray = (value, message) => {
  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue)) {
      throw new Error(message);
    }
    return parsedValue;
  } catch (err) {
    throw new Error('Invalid JSON array format');
  }
};

// Define Joi schemas for products
const baseProductSchema = Joi.object({
  productTitle: Joi.string().min(3).required(),
  productInfo: Joi.string().min(3).required(),
  productImages: Joi.array().items(
    Joi.string(), // Allow strings
    Joi.object() // Allow objects
  ),
  variantsThere: Joi.boolean().required().valid(false),
  metaTitle: Joi.string().required(),
  metaDescription: Joi.string().allow(''),
  urlHandle: Joi.string().required(),
  productActiveStatus: Joi.string().valid('1', '0').required(),
  vendor: Joi.number().required(),
  category: Joi.string().required(),
  productType: Joi.string().required(),
  collections: Joi.custom((value, helpers) => {
    return validateJSONArray(value, 'Tags must be an Array');
  }).required(),
  tags: Joi.custom((value, helpers) => {
    return validateJSONArray(value, 'Tags must be an Array');
  }).required(),
  brnad: Joi.number().required().allow(''),
});

const productSchemaWithoutVariants = baseProductSchema.keys({
  productPrice: Joi.number().required(),
  productComparePrice: Joi.number().allow(''),
  productIsTaxable: Joi.boolean().required(),
  productCostPerItem: Joi.number().required(),
  inventoryInfo: Joi.string().required(),
  cwos: Joi.boolean().required(),
  skuCode: Joi.string().required(),
  skuBarcode: Joi.string().allow(''),
  productWeight: Joi.string().required().allow(''),
  originCountry: Joi.string().required().allow(''),
});

const productSchemaWithVariants = baseProductSchema.keys({
  variantsThere: Joi.boolean().required().valid(true),
  variants: Joi.custom((value, helpers) => {
    return validateJSONArray(value, 'Variants must be an Array');
  }).required(),
});

const variantsSchema = Joi.object({
  variantId: Joi.string().allow(''),
  variantImage: Joi.array().allow(''),
  variantWeight: Joi.string().allow(''),
  variantWeightUnit: Joi.string().allow(''),
  value: Joi.string().required(),
  amount: Joi.string(),
  offerPrice: Joi.string(),
  quantity: Joi.number(),
  shCode: Joi.string().required().allow(''),
  barCode: Joi.string().required().allow(''),
  skuCode: Joi.string().required().allow(''),
  isTaxable: Joi.boolean().required(),
  shippingRequired: Joi.boolean().required(),
  inventoryId: Joi.number().required(),
  inventoryPolicy: Joi.string().required(),
  variantService: Joi.string().required(),
});

const validateProduct = async (reqBody, schema) => {
  try {
    await schema.validateAsync(reqBody, { abortEarly: false });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

const productValidation = catchAsync(async (req, res, next) => {
  const { variantsThere } = req.body;

  if (variantsThere.toLowerCase() === 'true') {
    await validateProduct(req.body, productSchemaWithVariants);
    const variantsData = JSON.parse(req.body.variants);
    for (let variant of variantsData) {
      let { main, sub } = variant;

      await validateProduct(main, variantsSchema);

      if (sub && sub.length > 0) {
        for (let subvariant of sub) {
          delete subvariant.id;
          await validateProduct(subvariant, variantsSchema);
        }
      }
    }
  } else {
    await validateProduct(req.body, productSchemaWithoutVariants);
  }

  // next();
});

const variantValidation = catchAsync(async (req, res, next) => {
  const { error } = variantsSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = { productValidation, variantValidation };
