const Joi = require('joi');
const AppError = require('../Utils/appError');

const JSONArrayValidator = (value, helpers) => {
  try {
    const parsedValue = JSON.parse(value);
    if (!Array.isArray(parsedValue)) {
      throw new Error('Variants order must be an array');
    }
    return parsedValue;
  } catch (err) {
    return helpers.error('any.custom', {
      message: 'Invalid JSON array format',
    });
  }
};

const productSchema = Joi.object({
  productTitle: Joi.string().min(3).max(500).required(),
  productInfo: Joi.string().min(3).required(),
  variantsOrder: Joi.string()
    .custom((value, helpers) => {
      JSONArrayValidator(value, helpers);
    })
    .required(),
  productPrice: Joi.string().required(),
  productComparePrice: Joi.string().required(),
  productIsTaxable: Joi.boolean().required(),
  productCostPerItem: Joi.number().required(),
  inventoryInfo: Joi.string().required(),
  vendor: Joi.string().required(),
  cwos: Joi.boolean().required(),
  skuCode: Joi.string().allow(''),
  skuBarcode: Joi.string().allow(''),
  productWeight: Joi.string().required(),
  originCountry: Joi.string().required(),
  productActiveStatus: Joi.string().valid('1', '0').required(),
  category: Joi.string().required(),
  productType: Joi.string().required(),
  collections: Joi.string()
    .custom((value, helpers) => {
      JSONArrayValidator(value, helpers);
    })
    .required(),
  tags: Joi.string()
    .custom((value, helpers) => {
      JSONArrayValidator(value, helpers);
    })
    .required(),
  metaTitle: Joi.string().required(),
  metaDescription: Joi.string().allow(''),
  urlHandle: Joi.string().required(),
  variantsThere: Joi.boolean().required(),
  variants: Joi.string()
    .custom((value, helpers) => {
      JSONArrayValidator(value, helpers);
    })
    .required(),
});

const variantsSchema = Joi.object({
  variantImage: Joi.string().required(),
  variantWeight: Joi.string().required(),
  variantUnitWeight: Joi.string().required(),
  value: Joi.string().required(),
  amount: Joi.string(),
  offerPrice: Joi.string(),
  quantity: Joi.string(),
  shCode: Joi.string().required().allow(''),
  barCode: Joi.string().required().allow(''),
  skuCode: Joi.string().required().allow(''),
  isTaxable: Joi.boolean().required(),
  shippingRequired: Joi.boolean().required(),
  inventoryId: Joi.string().required(),
  inventoryPolicy: Joi.string().required(),
  variantService: Joi.string().required(),
});

const productValidation = async (req, res, next) => {
  //console.log('Product Validation', req.body);
  const { variantsThere, variants } = req.body;
  const { error } = productSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  if (variantsThere) {
    const variants = JSON.parse(variants);
    for (let variant of variantsData) {
      let mainVariant = variant.main;
      let subvariants = variant.sub;

      if (subvariants.length > 0) {
        for (let subvariant of subvariants) {
          const { error } = variantsSchema.validate(subvariant);
          if (error) return next(new AppError(error.message, 400));
        }
      } else {
        const { error } = variantsSchema.validate(mainVariant);
        if (error) return next(new AppError(error.message, 400));
      }
    }
  }
  next();
};

module.exports = productValidation;
