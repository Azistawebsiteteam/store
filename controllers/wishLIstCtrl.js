const moment = require('moment');
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

const getWishlist = catchAsync(async (req, res, next) => {
  const query = `
      SELECT 
        w.azst_wishlist_id,
        w.azst_product_id,
        w.azst_variant_id,
        p.product_main_title,
        p.product_title,
        p.product_url_title,
        COALESCE(p.price, 0) AS price,
        p.min_cart_quantity,
        p.max_cart_quantity,
        COALESCE(s.compare_at_price, 0) AS compare_at_price,
        COALESCE(p.compare_at_price, 0) AS product_compare_at_price,
        s.variant_image,
        p.image_src,
        COALESCE(s.offer_price, 0) AS offer_price,
        s.offer_percentage,
        p.is_varaints_aval,
        COALESCE(i.azst_ipm_total_quantity, 0) AS product_qty
      FROM 
        azst_wishlist_tbl AS w
      LEFT JOIN 
        azst_sku_variant_info AS s 
        ON w.azst_variant_id = s.id
      LEFT JOIN 
        azst_products AS p
        ON w.azst_product_id = p.id
      LEFT JOIN 
        azst_central_inventory_tbl AS i
        ON p.id = i.azst_ipm_product_id
        AND w.azst_variant_id = i.azst_ipm_variant_id
      WHERE 
        w.azst_customer_id = ? 
        AND w.status = 1
    `;

  // Execute the query using the provided customer ID
  const result = await db(query, [req.empId]);

  // Map results to include the product image link, ensuring both variant and product images are handled
  const wishlist = result.map((product) => ({
    ...product,
    variant_image: getImageLink(req, product.variant_image, product.image_src),
  }));

  // Send the response with retrieved data
  res.status(200).json({ wishlist, message: 'Data Retrieved successfully' });
});

module.exports = { addToWl, isExistInWl, removeFromWl, getWishlist };
