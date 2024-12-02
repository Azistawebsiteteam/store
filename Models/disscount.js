const Joi = require('joi');
const AppError = require('../Utils/appError');

// Joi schema for discount
const discountSchema = Joi.object({
  title: Joi.string().required(),
  code: Joi.string().allow(null),
  method: Joi.string().valid('Automatic', 'Manual').required(),
  type: Joi.string().valid('percentage', 'flat', 'product').required(),
  productDscType: Joi.string().valid('percentage', 'flat', '').optional(),
  value: Joi.number().positive().required(),
  customers: Joi.string().required(),
  usageCount: Joi.number().integer().default(0),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
});

const productIdSchema = Joi.object({
  productId: Joi.number().min(1).required(),
  variantId: Joi.number().required(),
});

const collectionSchema = Joi.array().items(Joi.number()).required();

const validateProductIds = (products, schema) => {
  const parsedProducts = Array.isArray(products)
    ? products
    : JSON.parse(products);
  const validationResults = parsedProducts.map((subCat) =>
    schema.validate(subCat)
  );

  for (let result of validationResults) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  return parsedProducts; // Return parsed and validated products
};

const validateCollectionIds = (collections, schema) => {
  const parsedCollections = Array.isArray(collections)
    ? collections
    : JSON.parse(collections);
  const validationResults = schema.validate(parsedCollections);

  if (validationResults.error) {
    throw new Error('Collection Ids must be a number');
  }

  return parsedCollections; // Return parsed and validated collections
};

// Joi schema for discount conditions

const discountConditionSchema = Joi.object({
  discountId: Joi.number().integer().positive().optional().allow(null),

  scope: Joi.string().valid('cart', 'product', 'buy_x_get_y').required(),

  // `minCartValue` is mandatory when `scope` is 'cart', else it can be null or not present.
  minCartValue: Joi.number()
    .positive()
    .when('scope', {
      is: 'cart',
      then: Joi.required(),
      otherwise: Joi.allow(null),
    }),

  buyProductType: Joi.string()
    .valid('collection', 'product')
    .when('scope', {
      is: Joi.valid('product', 'buy_x_get_y'),
      then: Joi.required(),
      otherwise: Joi.allow(''),
    }),

  // `buyProductId` is required when `scope` is 'product' or 'buy_x_get_y', otherwise it can be null.
  buyProductId: Joi.custom((value, helpers) => {
    const { buyProductType } = helpers.state.ancestors[0]; // Fetch `buyProductType` from the parent object

    try {
      if (buyProductType === 'collection') {
        return validateCollectionIds(value, collectionSchema);
      } else if (buyProductType === 'product') {
        return validateProductIds(value, productIdSchema);
      }
    } catch (error) {
      return helpers.message(error.message);
    }

    return value; // Return value if no error is thrown
  }).when('scope', {
    is: Joi.valid('product', 'buy_x_get_y'),
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),

  // `minBuyQty` is required when `scope` is 'product' or 'buy_x_get_y', otherwise it can be null.
  minBuyQty: Joi.when('scope', {
    is: Joi.valid('product', 'buy_x_get_y'),
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.allow(null),
  }),

  getProductType: Joi.string()
    .valid('collection', 'product')
    .when('scope', {
      is: 'buy_x_get_y',
      then: Joi.required(),
      otherwise: Joi.allow(''),
    }),

  // `getYproductId` is required only when `scope` is 'buy_x_get_y', otherwise it can be null.
  getYproductId: Joi.custom((value, helpers) => {
    const { getProductType } = helpers.state.ancestors[0]; // Fetch `getProductType` from the parent object

    try {
      if (getProductType === 'collection') {
        return validateCollectionIds(value, collectionSchema);
      } else if (getProductType === 'product') {
        return validateProductIds(value, productIdSchema);
      }
    } catch (error) {
      return helpers.message(error.message);
    }

    return value; // Return value if no error is thrown
  }).when('scope', {
    is: 'buy_x_get_y',
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),

  // `maxGetYQty` is required only when `scope` is 'buy_x_get_y', otherwise it can be null.
  maxGetYQty: Joi.when('scope', {
    is: 'buy_x_get_y',
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.allow(null),
  }),
});

module.exports = { discountSchema, discountConditionSchema };
