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

// function validateNonEmptyArray(value, helpers) {
//   if (!Array.isArray(value) || value.length === 0) {
//     return helpers.error('any.invalid');
//   }
//   return value; // If validation passes, return the value
// }
// variants: Joi.custom((value, helpers) => {
//   const validatedValue = validateNonEmptyArray(value, helpers);
//   if (validatedValue === undefined) {
//     return helpers.error('any.invalid');
//   }
//   return validatedValue;
// })
//   .required()
//   .messages({
//     'any.invalid': 'Variants must be a non-empty array',
//   }),

// Define Joi schemas for products

const baseProductSchema = Joi.object({
  productId: Joi.string().allow(''),
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
  variants: Joi.custom((value, helpers) => {
    return validateJSONArray(value, 'Variants must be an Array');
  }).required(),
  variantImage: Joi.alternatives().try(
    Joi.string().allow(''), // Allow string type
    Joi.object(), // Allow number type
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

module.exports = { productValidation, variantValidation };
