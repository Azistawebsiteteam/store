const moment = require('moment');
const util = require('util');
const Joi = require('joi');
const db = require('../dbconfig');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const whishlistSchema = Joi.object({
  productId: Joi.number().min(1).required(),
  variantId: Joi.number().min(1).required(),
});

const isExistInWl = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;
  const { empId } = req;

  const { error } = whishlistSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  const query = `SELECT azst_variant_id FROM azst_wishlist 
                 WHERE azst_customer_id=? AND status = 1 AND azst_variant_id = ?`;
  const values = [empId, variantId];
  const result = await db(query, values);
  if (result.length > 0)
    return next(new AppError('Product already in whishList', 400));
  next();
});

const addToWl = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.body;
  const { empId } = req;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const query = `INSERT INTO azst_wishlist (azst_product_id,azst_variant_id,azst_customer_id,createdon)
                  VALUES (?,?,?,?)`;
  const values = [productId, variantId, empId, today];

  await db(query, values);
  res.status(200).json({ message: 'Product added successfully' });
});

const removeFromWl = catchAsync(async (req, res, next) => {
  const { whishlistId } = req.body;

  if (!whishlistId) return next(new AppError('whishlistId is required', 400));
  const query = `UPDATE azst_wishlist SET status = 0 , updateon = ? WHERE azst_wishlist_id = ?`;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  await db(query, [today, whishlistId]);
  res.status(200).json({ message: 'Product removed successfully' });
});

const getWhishlist = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_wishlist_id,variant_image,size,actual_price , offer_price,offer_percentage
                    FROM azst_wishlist
                    JOIN azst_sku_variant_info ON  azst_wishlist.azst_variant_id = azst_sku_variant_info.id
                    WHERE azst_customer_id = ? AND azst_wishlist.status = 1`;

  const result = await db(query, req.empId);
  const whish_list = result.map((product) => ({
    ...product,
    variant_image: `${req.protocol}://${req.get('host')}/product/variantimage/${
      product.variant_image
    }`,
  }));
  res.status(200).json({ whish_list, message: 'Data Retrived successfully' });
});

module.exports = { addToWl, isExistInWl, removeFromWl, getWhishlist };
