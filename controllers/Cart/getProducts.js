const Joi = require('joi');
const db = require('../../Database/dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const Email = require('../../Utils/email');

const getImageName = (images) => {
  const parsedImages = JSON.parse(images);
  if (parsedImages) {
    return parsedImages[1] ? parsedImages[1] : parsedImages[0];
  } else {
    return '';
  }
};

const getCartSchema = Joi.object({
  customerId: Joi.number().optional().allow(0),
  sessionId: Joi.string().optional().allow(''),
  discountCode: Joi.string().optional().allow(''),
  discountType: Joi.string().optional().allow(''),
});

const getCartData = catchAsync(async (req, res, next) => {
  const { customerId, sessionId } = req.body;

  const { error } = getCartSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  let filterQuery = '';
  let fvaues = [];
  if (customerId && customerId.toString() !== '0') {
    fvaues = [customerId];
    filterQuery = 'azst_customer_id = ?';
  } else {
    fvaues = [sessionId];
    filterQuery = 'azst_customer_id = 0 AND azst_session_id = ?';
  }

  const query = `
                SELECT
                    ac.azst_cart_id,
                    ac.azst_cart_product_id,
                    ac.azst_cart_variant_id,
                    ac.azst_cart_quantity,
                    ac.azst_cart_product_type,
                    ac.azst_cart_dsc_amount,
                    ac.azst_cart_dsc_by_ids,
                    ac.azst_cart_dsc_code,
                    p.product_main_title,
                    p.product_url_title,
                    p.min_cart_quantity,
                    p.max_cart_quantity,
                    v.variant_image,
                    COALESCE(p.compare_at_price, 0) AS product_compare_at_price,
                    COALESCE(p.price, 0) AS price,
                    COALESCE(v.compare_at_price, 0) AS compare_at_price,
                    COALESCE(v.offer_price, 0) AS offer_price,
                    COALESCE(offer_percentage, 0) AS offer_percentage,
                    p.image_src,
                    p.is_varaints_aval,
                    v.option1,
                    v.option2,
                    v.option3,
                    COALESCE(SUM(ipm.azst_ipm_avbl_quantity), 0) AS avbl_quantity
                FROM
                    (SELECT
                        azst_cart_id,
                        azst_cart_product_id,
                        azst_cart_variant_id,
                        azst_cart_product_type,
                        azst_cart_dsc_amount,
                        azst_cart_dsc_code,
                        azst_cart_dsc_by_ids,
                        SUM(azst_cart_quantity) AS azst_cart_quantity,
                        MAX(azst_cart_created_on) AS max_created_on
                    FROM
                        azst_cart_tbl
                    WHERE
                        azst_cart_status = 1
                        AND ${filterQuery}

                    GROUP BY
                        azst_cart_product_id,
                        azst_cart_variant_id,
                        azst_cart_product_type,
                        azst_cart_dsc_amount
                    ) ac
                LEFT JOIN
                    azst_sku_variant_info v
                    ON ac.azst_cart_variant_id = v.id
                LEFT JOIN
                    azst_products p
                    ON ac.azst_cart_product_id = p.id
                LEFT JOIN
                    azst_inventory_product_mapping ipm
                    ON (ac.azst_cart_product_id = ipm.azst_ipm_product_id
                    AND ac.azst_cart_variant_id = ipm.azst_ipm_variant_id)
                GROUP BY
                    ac.azst_cart_product_id,
                    ac.azst_cart_variant_id
                ORDER BY
                    p.product_main_title DESC;`;

  await db("SET SESSION sql_mode = ''");
  const result = await db(query, fvaues);

  const cart_products = result.map((product) => ({
    ...product,
    variant_image: `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/variantimage/${getImageName(product.variant_image)}`,
    image_src: `${req.protocol}://${req.get('host')}/api/images/product/${
      product.image_src
    }`,
  }));

  if (cart_products.length === 0) {
    return res.status(200).json({
      cart_products: [],
      cart_total: 0,
      discountAmount: '0.00',
      message: '',
    });
  }

  req.body.cartList = cart_products;
  next();
});

const getCartSimilarProducts = catchAsync(async (req, res, next) => {
  const { cartList } = req.body;

  if (!cartList || !Array.isArray(cartList) || cartList.length === 0) {
    return res.status(400).json({ message: 'Cart list is empty ' });
  }

  // Extract product IDs from the cart list
  const productIds = cartList.map((p) => p.azst_cart_product_id);

  // Fetch features of the products in the cart (category, type, tags, collections, brand)
  const cartProductsQuery = `
    SELECT id, product_category, type, tags, collections, brand_id, price
    FROM azst_products 
    WHERE id IN (?)
  `;

  const cartProducts = await db(cartProductsQuery, [productIds]);

  if (!cartProducts || cartProducts.length === 0) {
    req.body.similarProducts = [];
    next();
    return;
  }

  // Helper function to parse JSON and return an array
  const parseJsonArray = (jsonString) => {
    try {
      return JSON.parse(jsonString) || [];
    } catch {
      return [];
    }
  };

  // Separate product attributes into arrays for running the single query later
  const categories = new Set();
  const types = new Set();
  const brands = new Set();
  const tags = new Set();
  const collections = new Set();
  let minPrice = Infinity;
  let maxPrice = 0;

  // Collect all product attributes in separate arrays
  cartProducts.forEach((product) => {
    categories.add(product.product_category);
    types.add(product.type);
    brands.add(product.brand_id);

    // Parse tags and collections and merge them into sets
    parseJsonArray(product.tags).forEach((tag) => tags.add(tag));
    parseJsonArray(product.collections).forEach((collection) =>
      collections.add(collection)
    );

    // Calculate min and max price ranges
    const lowerPriceRange = product.price * 0.8;
    const upperPriceRange = product.price * 1.2;
    minPrice = Math.min(minPrice, lowerPriceRange);
    maxPrice = Math.max(maxPrice, upperPriceRange);
  });

  // OR P.price BETWEEN ? AND ?

  // Convert sets to arrays for query
  const uniqueCategories = [...categories];
  const uniqueTypes = [...types];
  const uniqueBrands = [...brands];
  const uniqueTags = [...tags];
  const uniqueCollections = [...collections];

  const similarProductsQuery = `
  SELECT 
    P.id AS product_id,
    IFNULL(V.id, 0) AS variant_id, 
    P.product_main_title, 
    P.product_title,
    P.product_url_title,
    CONCAT('${req.protocol}://${req.get(
    'host'
  )}/api/images/product/', P.image_src) AS image_src,
    P.image_alt_text,
    COALESCE(P.compare_at_price, 0) AS product_compare_at_price,
    COALESCE(P.price, 0) AS price,
    P.min_cart_quantity,
    P.max_cart_quantity,
    P.is_varaints_aval,
    COALESCE(V.compare_at_price, 0) AS compare_at_price,
    COALESCE(V.offer_price, 0) AS offer_price,
    V.option1, V.option2, V.option3,
    COALESCE(AVG(prt.review_points), 1) AS product_review_points
  FROM azst_products P
  LEFT JOIN azst_sku_variant_info V ON P.id = V.product_id AND V.status = 1
  LEFT JOIN product_review_rating_tbl prt ON P.id = prt.product_id
  WHERE 
    (P.product_category IN (?) 
    OR P.type IN (?) 
    OR P.brand_id IN (?)
    OR (FIND_IN_SET(?, P.tags) > 0 OR FIND_IN_SET(?, P.collections) > 0))
    AND P.id NOT IN (?)
    AND P.status = 1
  GROUP BY
    P.id, P.product_main_title, P.product_title, P.product_url_title, P.image_src,
    P.image_alt_text, P.price, P.compare_at_price, P.min_cart_quantity,
    P.max_cart_quantity, P.is_varaints_aval, V.option1, V.option2, V.option3
  LIMIT 10
`;

  // Perform the database query to find similar products
  const similarProducts = await db(similarProductsQuery, [
    uniqueCategories,
    uniqueTypes,
    uniqueBrands,
    uniqueTags.join(','), // Combine unique tags
    uniqueCollections.join(','), // Combine unique collections
    productIds,
  ]);

  req.body.similarProducts = [...similarProducts];
  next();
});

const removeFromCart = catchAsync(async (req, res, next) => {
  const { cartId } = req.body;

  const query = `UPDATE azst_cart_tbl SET azst_cart_status = 0 
                 WHERE azst_cart_id = ? `;

  await db(query, [cartId]);

  const removeDscProducts = `DELETE FROM azst_cart_tbl 
                              WHERE azst_cart_dsc_by_ids IS NOT NULL 
                              AND azst_cart_dsc_by_ids != '' 
                              AND JSON_CONTAINS(azst_cart_dsc_by_ids, ?, '$');`;
  const id = `${cartId}`;

  await db(removeDscProducts, [id]);

  res.status(200).json({ message: 'Cart updated successfully' });
});

const getabandonmentCartList = async (req, res, next) => {
  let subQuery = req.userId ? `WHERE c.azst_customer_id = ${req.userId}` : '';
  try {
    const variantImageBaseUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/variantimage/`;

    const productImageBaseUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/`;

    const query = `SELECT
                  c.azst_cart_id,
                  c.azst_cart_product_id,
                  c.azst_cart_variant_id,
                  c.azst_cart_quantity,
                  cu.azst_customer_id,
                  c.azst_session_id,
                  c.azst_cart_status,
                  DATE_FORMAT(c.azst_cart_created_on, '%d-%m-%Y') AS azst_cart_added_on,
                  CONCAT(cu.azst_customer_fname, ' ', cu.azst_customer_lname) AS azst_customer_name,
                  cu.azst_customer_mobile,
                  cu.azst_customer_email,
                  p.product_url_title,
                  p.product_main_title,
                  CONCAT('${variantImageBaseUrl}', v.variant_image) AS variant_image,
                  p.compare_at_price AS product_compare_at_price,
                  p.price,
                  v.compare_at_price AS variant_compare_at_price,
                  v.offer_price,
                  v.offer_percentage,
                  CONCAT('${productImageBaseUrl}', p.image_src) AS product_image,
                  p.is_varaints_aval
                FROM azst_cart_tbl c
                LEFT JOIN azst_customers_tbl cu ON c.azst_customer_id = cu.azst_customer_id
                LEFT JOIN azst_sku_variant_info v ON c.azst_cart_variant_id = v.id
                LEFT JOIN azst_products p ON c.azst_cart_product_id = p.id
                ${subQuery}
                ORDER BY azst_cart_added_on DESC`;

    const result = await db(query);
    return result;
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

const abandonmentCart = catchAsync(async (req, res, next) => {
  const products = await getabandonmentCartList(req, res, next);
  res.status(200).json(products);
});

const abandonmentCartUsers = async (req, res, next) => {
  const query = `SELECT DISTINCT c.azst_customer_id, cu.azst_customer_mobile,
                   cu.azst_customer_email,cu.azst_customer_acceptemail_marketing,cu.azst_customer_acceptsms_marketing
                   FROM azst_cart_tbl c
                   LEFT JOIN azst_customers_tbl cu ON c.azst_customer_id = cu.azst_customer_id
                   WHERE 
                   c.azst_customer_id <> 0 AND
                   c.azst_cart_status = 1 AND
                   DATE(c.azst_cart_created_on) = CURRENT_DATE`;

  const result = await db(query);

  for (const cu of result) {
    const {
      azst_customer_id,
      azst_customer_mobile,
      azst_customer_acceptsms_marketing,
      azst_customer_email,
      azst_customer_acceptemail_marketing,
    } = cu;

    // Send SMS for each customer, waiting for each one to complete before the next
    if (azst_customer_acceptsms_marketing !== 'No') {
      await new Sms(azst_customer_id, azst_customer_mobile).cartCheckout();
    }
    if (azst_customer_acceptemail_marketing !== 'No') {
      req.userId = azst_customer_id;
      const products = await getabandonmentCartList(req, res, next);
      await new Email('', azst_customer_email, '').cartReminder(products);
    }
  }
};

module.exports = {
  getCartData,
  removeFromCart,
  abandonmentCart,
  getCartSimilarProducts,
  abandonmentCartUsers,
};
