const Joi = require('joi');
const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

// Define a reusable function to validate JSON array format
// Define a custom validation function to check for non-empty array

const validateJSONArray = (value, message) => {
  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
      throw new Error(message);
    }
    return parsedValue;
  } catch (err) {
    throw new Error('Invalid JSON array format');
  }
};

// Define Joi schemas for products

const baseProductSchema = Joi.object({
  productId: Joi.string().allow(''),
  productMainTitle: Joi.string().min(3).required(),
  productTitle: Joi.string().min(3).required(),
  productInfo: Joi.string().min(3).required(),
  productImages: Joi.array().items(
    Joi.string(), // Allow strings
    Joi.object() // Allow objects
  ),
  variantsThere: Joi.boolean().required(),
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
  brand: Joi.number().required().messages({
    'any.required': 'please select a brand',
    'number.base': 'please select a valid brand',
  }),
  minCartQty: Joi.number().optional(),
  maxCartQty: Joi.number().optional(),
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
  variantsThere: Joi.boolean().required().valid(false),
});

const productSchemaWithVariants = baseProductSchema.keys({
  variantsThere: Joi.boolean().required().valid(true),
  vInventoryInfo: Joi.string().required(),
  variants: Joi.custom((value, helpers) => {
    return validateJSONArray(value, 'Variants must be an Array');
  }).required(),
  variantImage: Joi.alternatives().try(
    Joi.string().allow(''), // Allow string type
    Joi.object(), // Allow object type
    Joi.array()
  ),
  variantsOrder: Joi.string().allow('[]'),
});

const variantsSchema = Joi.object({
  id: Joi.string().allow(''),
  variantId: Joi.alternatives()
    .try(
      Joi.string().allow(''), // Allow string type
      Joi.number() // Allow number type
    )
    .required(),
  variantImage: Joi.alternatives()
    .try(
      Joi.string().allow(''), // Allow string type
      Joi.object(), // Allow number type
      Joi.array() // Allow array type
    )
    .required(),
  variantWeight: Joi.string().allow(''),
  variantWeightUnit: Joi.string().allow(''),
  value: Joi.string().required(),
  //offer_price: Joi.string().required().allow(''),
  offer_price: Joi.alternatives()
    .try(
      Joi.string(), // Allow string type
      Joi.number() // Allow number type
    )
    .required(),
  comparePrice: Joi.alternatives().try(
    Joi.number().min(0).required(),
    Joi.string().valid('0').required()
  ),
  quantity: Joi.number(),
  hsCode: Joi.string().required().allow(''),
  barcode: Joi.string().required().allow('', null),
  skuCode: Joi.string().required().allow(''),
  isTaxable: Joi.boolean().required(),
  shippingRequired: Joi.boolean().required(),
  inventoryId: Joi.number().required(),
  inventoryPolicy: Joi.string().required().allow(''),
  variantService: Joi.string().required().allow(''),
  Costperitem: Joi.number(),
});

// Define the schema for a single ingredient
const singleIngredientSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  title: Joi.string().min(5).required(),
  description: Joi.string().min(5).required(),
  image: Joi.alternatives()
    .try(Joi.string(), Joi.object())
    .required()
    .messages({
      'any.required': 'Please upload an image', // Custom message for required field
      'object.base': 'Image must be an object', // Custom message for invalid type
    }), // assuming ingImg is a string (e.g., URL or filename)
});

const singleFeatureSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  title: Joi.string().min(5).required(),
  image: Joi.alternatives()
    .try(Joi.string(), Joi.object())
    .required()
    .messages({
      'any.required': 'Please upload an image', // Custom message for required field
      'object.base': 'Image must be an object', // Custom message for invalid type
    }), // assuming ingImg is a string (e.g., URL or filename)
});

// Validate the ingredients array
const validateIng = (ings, schema) => {
  const parsedIngs = JSON.parse(ings);
  const validationResults = parsedIngs.map((ing) => schema.validate(ing));

  for (let result of validationResults) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  return parsedIngs; // Return parsed and validated ingredients
};

// Define the schema for the entire request body
const productInfoSchema = Joi.object({
  ingredients: Joi.custom((value, helpers) => {
    try {
      return validateIng(value, singleIngredientSchema);
    } catch (error) {
      return helpers.message(error.message);
    }
  }).required(),
  features: Joi.custom((value, helpers) => {
    try {
      return validateIng(value, singleFeatureSchema);
    } catch (error) {
      return helpers.message(error.message);
    }
  }).required(),
  productId: Joi.number().required().min(1),
  ingImages: Joi.alternatives().try(Joi.string(), Joi.array()).optional(),
  feaImages: Joi.alternatives().try(Joi.string(), Joi.array()).optional(),
  deleteIngredient: Joi.array().optional(),
  deleteFeatures: Joi.array().optional(),
});

const validateProduct = async (reqBody, schema) => {
  try {
    await schema.validateAsync(reqBody, { abortEarly: false });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

const productValidation = catchAsync(async (req, res, next) => {
  const { variantsThere, productImages } = req.body;

  req.body.variantsThere = JSON.parse(variantsThere);

  if (typeof productImages === 'string') {
    req.body.productImages = JSON.parse(productImages);
  }

  if (variantsThere && variantsThere.toLowerCase() === 'true') {
    const { variants } = req.body;

    await validateProduct(req.body, productSchemaWithVariants);
    const variantsData = JSON.parse(variants);

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
  next();
});

const variantValidation = catchAsync(async (req, res, next) => {
  const { error } = variantsSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

const productInfoValidation = catchAsync(async (req, res, next) => {
  const { error } = productInfoSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

module.exports = {
  productValidation,
  variantValidation,
  productInfoValidation,
};
