const moment = require('moment');
const util = require('util');
const Joi = require('joi');
const db = require('../Database/dbconfig');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const whishlistSchema = Joi.object({
  productId: Joi.number().min(1).required(),
  variantId: Joi.number().required(),
});

const isExistInWl = catchAsync(async (req, res, next) => {
  const { variantId, productId } = req.body;
  const { empId } = req;

  const { error } = whishlistSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  const query = `SELECT azst_variant_id FROM azst_wishlist_tbl 
                 WHERE azst_customer_id= ?  AND azst_product_id =?  AND azst_variant_id = ? AND status = 1`;
  const values = [empId, productId, variantId];
  const result = await db(query, values);
  if (result.length > 0)
    return next(new AppError('Product already in wishlist', 400));
  next();
});

const addToWl = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.body;
  const { empId } = req;

  const query = `INSERT INTO azst_wishlist_tbl (azst_product_id,azst_variant_id,azst_customer_id)
                  VALUES (?,?,?)`;
  const values = [productId, variantId, empId];

  await db(query, values);
  res.status(200).json({ message: 'Product added successfully' });
});

const removeFromWl = catchAsync(async (req, res, next) => {
  const { whishlistId } = req.body;

  if (!whishlistId) return next(new AppError('wishlistId is required', 400));
  const query = `UPDATE azst_wishlist_tbl SET status = 0 , updateon = ? WHERE azst_wishlist_id = ?`;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  await db(query, [today, whishlistId]);
  res.status(200).json({ message: 'Product removed successfully' });
});

const getImageLink = (req, images, fallbackImage) => {
  if (!images || JSON.parse(images).every((img) => !img.trim())) {
    return `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/${fallbackImage}`;
  }

  const [img1, img2] = images.split(',');
  const selectedImage = img1 || img2;

  return `${req.protocol}://${req.get(
    'host'
  )}/api/images/product/variantimage/${selectedImage}`;
};

const getWhishlist = catchAsync(async (req, res, next) => {
  const query = `
    SELECT 
      azst_wishlist_tbl.azst_wishlist_id,
      azst_wishlist_tbl.azst_product_id,
      azst_wishlist_tbl.azst_variant_id,
      azst_products.product_title,
      azst_products.product_url_title,
      COALESCE(azst_products.price, 0) AS price,
      azst_products.min_cart_quantity,
      azst_products.max_cart_quantity,
      COALESCE(azst_sku_variant_info.compare_at_price, 0) AS compare_at_price,
      COALESCE(azst_products.compare_at_price,0) AS product_compare_at_price,
      azst_sku_variant_info.variant_image,
      azst_products.image_src,
      COALESCE(azst_sku_variant_info.offer_price, 0) AS offer_price,
      azst_sku_variant_info.offer_percentage,
      azst_products.is_varaints_aval,
      COALESCE(SUM(azst_inventory_product_mapping.azst_ipm_onhand_quantity), 0) AS product_qty
    FROM 
      azst_wishlist_tbl
    LEFT JOIN 
      azst_sku_variant_info 
      ON azst_wishlist_tbl.azst_variant_id = azst_sku_variant_info.id
    LEFT JOIN 
      azst_products 
      ON azst_wishlist_tbl.azst_product_id = azst_products.id
    LEFT JOIN 
      azst_inventory_product_mapping 
      ON azst_products.id = azst_inventory_product_mapping.azst_ipm_product_id
    WHERE 
      azst_wishlist_tbl.azst_customer_id = ? 
      AND azst_wishlist_tbl.status = 1
    GROUP BY 
      azst_products.id,
      azst_wishlist_tbl.azst_wishlist_id,
      azst_wishlist_tbl.azst_product_id,
      azst_wishlist_tbl.azst_variant_id,
      azst_products.product_title,
      azst_products.product_url_title,
      azst_products.price,
      azst_products.min_cart_quantity,
      azst_products.max_cart_quantity,
      azst_sku_variant_info.compare_at_price,
      azst_products.compare_at_price,
      azst_sku_variant_info.variant_image,
      azst_products.image_src,
      azst_sku_variant_info.offer_price,
      azst_sku_variant_info.offer_percentage,
      azst_products.is_varaints_aval`;

  // Set SQL mode to empty for the session
  await db(`SET SESSION sql_mode = ''`);

  // Execute the main query
  const result = await db(query, req.empId);

  // Map results to include the product image link
  const whish_list = result.map((product) => ({
    ...product,
    variant_image: getImageLink(req, product.variant_image, product.image_src),
  }));

  // Return the response
  res.status(200).json({ whish_list, message: 'Data Retrieved successfully' });
});

module.exports = { addToWl, isExistInWl, removeFromWl, getWhishlist };
