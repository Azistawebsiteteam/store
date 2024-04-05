const moment = require('moment');
const util = require('util');
const Joi = require('joi');
const db = require('../dbconfig');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const whishlistSchema = Joi.object({
  productId: Joi.number().min(1).required(),
  variantId: Joi.number().required(),
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
    return next(new AppError('Product already in wishlist', 400));
  next();
});

const addToWl = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.body;
  const { empId } = req;

  const query = `INSERT INTO azst_wishlist (azst_product_id,azst_variant_id,azst_customer_id)
                  VALUES (?,?,?)`;
  const values = [productId, variantId, empId];

  await db(query, values);
  res.status(200).json({ message: 'Product added successfully' });
});

const removeFromWl = catchAsync(async (req, res, next) => {
  const { whishlistId } = req.body;

  if (!whishlistId) return next(new AppError('wishlistId is required', 400));
  const query = `UPDATE azst_wishlist SET status = 0 , updateon = ? WHERE azst_wishlist_id = ?`;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  await db(query, [today, whishlistId]);
  res.status(200).json({ message: 'Product removed successfully' });
});

const getImageLink = (req, imges, pImg) => {
  if (imges === '' || imges === null) {
    return `${req.protocol}://${req.get('host')}/product/images${pImg}`;
  }
  return `${req.protocol}://${req.get('host')}/product/variantimage/${
    JSON.parse(imges)[1]
  }`;
};

const getWhishlist = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_wishlist_id,product_title,product_url_title,price,compare_at_price,variant_image,image_src,azst_product_id,azst_variant_id,actual_price , offer_price,offer_percentage
                    FROM azst_wishlist
                    LEFT JOIN azst_sku_variant_info ON  azst_wishlist.azst_variant_id = azst_sku_variant_info.id
                    LEFT JOIN azst_products ON azst_wishlist.azst_product_id = azst_products.id
                    WHERE azst_customer_id = ? AND azst_wishlist.status = 1`;

  const result = await db(query, req.empId);

  const whish_list = result.map((product) => ({
    ...product,
    variant_image: getImageLink(req, product.variant_image, product.image_src),
  }));
  res.status(200).json({ whish_list, message: 'Data Retrived successfully' });
});

module.exports = { addToWl, isExistInWl, removeFromWl, getWhishlist };
