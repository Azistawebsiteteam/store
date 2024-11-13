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

  const result = await db(query, values);

  res.status(200).json({
    message: 'Product added successfully',
    wishlist_id: result.insertId,
  });
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
  const query = `SELECT
          w.azst_wishlist_id,
          w.azst_product_id,
          w.azst_variant_id,
          w.azst_customer_id,
          w.status,
          w.azst_wishlist_id,
          w.azst_product_id,
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
         COALESCE(CASE
              -- When there's no variant in the wishlist (azst_variant_id = 0), sum all quantities for the product
              WHEN w.azst_variant_id = 0 THEN (
                  SELECT COALESCE(SUM(i.azst_ipm_total_quantity) , 0) AS product_quantity
                  FROM azst_central_inventory_tbl AS i
                  WHERE i.azst_ipm_product_id = w.azst_product_id
              )
              -- When there's a variant in the wishlist, get the exact quantity for the matching product and variant
              ELSE (
                  SELECT COALESCE(i.azst_ipm_total_quantity, 0) AS product_quantity
                  FROM azst_central_inventory_tbl AS i
                  WHERE i.azst_ipm_product_id = w.azst_product_id
                    AND i.azst_ipm_variant_id = w.azst_variant_id
              )
          END,0) AS product_quantity
       FROM azst_wishlist_tbl AS w
       LEFT JOIN
          azst_products AS p
          ON w.azst_product_id = p.id
   LEFT JOIN
      azst_sku_variant_info AS s
      ON w.azst_variant_id  = s.id
       WHERE w.azst_customer_id = ? AND w.status = 1
       ORDER BY createdon DESC
  `;

  await db("SET SESSION sql_mode = ''");

  // Execute the query using the provided customer ID
  const products = await db(query, [req.empId]);

  const wishlist = [];
  const getUpadteP = (product, variant) => {
    const updateP = {
      ...product,
      ...variant,
      variant_image: getImageLink(
        req,
        product.variant_image,
        product.image_src
      ),
    };
    wishlist.push(updateP);
  };

  for (let product of products) {
    if (product.azst_variant_id === 0) {
      const getPrices = `SELECT COALESCE(compare_at_price, 0) AS compare_at_price,COALESCE(offer_price, 0) AS offer_price
                          FROM azst_sku_variant_info WHERE product_id = ? LIMIT 1`;
      const [variant] = await db(getPrices, [product.azst_product_id]);
      getUpadteP(product, variant);
    } else {
      getUpadteP(product, {});
    }
  }

  // Send the response with retrieved data
  res.status(200).json({ wishlist, message: 'Data Retrieved successfully' });
});

module.exports = { addToWl, isExistInWl, removeFromWl, getWishlist };
