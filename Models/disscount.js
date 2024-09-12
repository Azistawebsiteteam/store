const Joi = require('joi');
const AppError = require('../Utils/appError');

// Joi schema for discount
const discountSchema = Joi.object({
  title: Joi.string().required(),
  code: Joi.string().allow(null),
  method: Joi.string().valid('Automatic', 'Manual').required(),
  type: Joi.string().valid('percentage', 'flat').required(),
  value: Joi.number().positive().required(),
  customers: Joi.string().required(),
  usageCount: Joi.number().integer().default(0),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
});

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

  buyProductType: Joi.string().when('scope', {
    is: Joi.valid('product', 'buy_x_get_y'),
    then: Joi.required().valid('collection', 'product'),
    otherwise: Joi.allow(''),
  }),

  // `buyProductId` is required when `scope` is 'product' or 'buy_x_get_y', otherwise it can be null.
  buyProductId: Joi.string().when('scope', {
    is: Joi.valid('product', 'buy_x_get_y'),
    then: Joi.required(),
    otherwise: Joi.allow(''),
  }),

  // `minBuyQty` is required when `scope` is 'product' or 'buy_x_get_y', otherwise it can be null.
  minBuyQty: Joi.number()
    .integer()
    .positive()
    .when('scope', {
      is: Joi.valid('product', 'buy_x_get_y'),
      then: Joi.required(),
      otherwise: Joi.allow(null),
    }),

  getProductType: Joi.string().when('scope', {
    is: 'buy_x_get_y',
    then: Joi.required().valid('collection', 'product'),
    otherwise: Joi.allow(''),
  }),

  // `getYproductId` is required only when `scope` is 'buy_x_get_y', otherwise it can be null.
  getYproductId: Joi.string().when('scope', {
    is: 'buy_x_get_y',
    then: Joi.required(),
    otherwise: Joi.allow(''),
  }),

  // `maxGetYQty` is required only when `scope` is 'buy_x_get_y', otherwise it can be null.
  maxGetYQty: Joi.number()
    .integer()
    .positive()
    .when('scope', {
      is: Joi.valid('product', 'buy_x_get_y'),
      then: Joi.required(),
      otherwise: Joi.allow(null),
    }),
});

module.exports = { discountSchema, discountConditionSchema };
