const Joi = require('joi');
const moment = require('moment');
const db = require('../../Database/dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

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
                    p.product_main_title,
                    p.product_url_title,
                    p.min_cart_quantity,
                    p.max_cart_quantity,
                    v.variant_image,
                    p.compare_at_price AS product_compare_at_price,
                    p.price,
                    v.compare_at_price,
                    v.offer_price,
                    offer_percentage,
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
                    ac.max_created_on DESC;`;

  //   const query = `SELECT
  //     ac.azst_cart_id,
  //     ac.azst_cart_product_id,
  //     ac.azst_cart_variant_id,
  //     ac.azst_cart_quantity,
  //     ac.azst_cart_product_type,
  //     IFNULL(ac.azst_cart_dsc_amount, 0) AS azst_cart_dsc_amount,
  //     p.product_main_title,
  //     p.product_url_title,
  //     p.min_cart_quantity,
  //     p.max_cart_quantity,
  //     v.variant_image,
  //     p.compare_at_price AS product_compare_at_price,
  //     p.price,
  //     v.compare_at_price AS variant_compare_at_price,
  //     v.offer_price,
  //     v.offer_percentage,
  //     p.image_src,
  //     p.is_varaints_aval,
  //     v.option1,
  //     v.option2,
  //     v.option3,
  //     COALESCE(SUM(ipm.azst_ipm_avbl_quantity), 0) AS avbl_quantity
  // FROM
  //     (SELECT
  //         azst_cart_id,
  //         azst_cart_product_id,
  //         azst_cart_variant_id,
  //         azst_cart_product_type,
  //         azst_cart_dsc_amount,
  //         SUM(azst_cart_quantity) AS azst_cart_quantity,
  //         MAX(azst_cart_created_on) AS max_created_on
  //     FROM
  //         azst_cart_tbl
  //     WHERE
  //         azst_cart_status = 1
  //         AND ${filterQuery}
  //     GROUP BY
  //         azst_cart_id,
  //         azst_cart_product_id,
  //         azst_cart_variant_id,
  //         azst_cart_product_type,
  //         azst_cart_dsc_amount
  //     ) ac
  // LEFT JOIN
  //     azst_sku_variant_info v
  //     ON ac.azst_cart_variant_id = v.id
  // LEFT JOIN
  //     azst_products p
  //     ON ac.azst_cart_product_id = p.id
  // LEFT JOIN
  //     azst_inventory_product_mapping ipm
  //     ON (ac.azst_cart_product_id = ipm.azst_ipm_product_id
  //     AND ac.azst_cart_variant_id = ipm.azst_ipm_variant_id)
  // GROUP BY
  //     ac.azst_cart_id,
  //     ac.azst_cart_product_id,
  //     ac.azst_cart_variant_id,
  //     ac.azst_cart_quantity,
  //     ac.azst_cart_product_type,
  //     ac.azst_cart_dsc_amount,
  //     p.product_main_title,
  //     p.product_url_title,
  //     p.min_cart_quantity,
  //     p.max_cart_quantity,
  //     v.variant_image,
  //     p.compare_at_price,
  //     p.price,
  //     v.compare_at_price,
  //     v.offer_price,
  //     v.offer_percentage,
  //     p.image_src,
  //     p.is_varaints_aval,
  //     v.option1,
  //     v.option2,
  //     v.option3
  // ORDER BY
  //     ac.max_created_on DESC;
  // `;

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

  console.log(cart_products);

  // AND (azst_customer_id <> 0  AND azst_customer_id = ? AND azst_session_id = ?)
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

const removeFromCart = catchAsync(async (req, res, next) => {
  const { cartId } = req.body;
  const query =
    'Update azst_cart_tbl set azst_cart_status = 0 where azst_cart_id = ?';
  const result = await db(query, [cartId]);
  res.status(200).json({ message: 'Cart updated successfully' });
});

const abandonmentCart = catchAsync(async (req, res, next) => {
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
                  CONCAT(?, v.variant_image) AS variant_image,
                  p.compare_at_price AS product_compare_at_price,
                  p.price,
                  v.compare_at_price AS variant_compare_at_price,
                  v.offer_price,
                  v.offer_percentage,
                  CONCAT(?, p.image_src) AS product_image,
                  p.is_varaints_aval
                FROM azst_cart_tbl c
                LEFT JOIN azst_customers_tbl cu ON c.azst_customer_id = cu.azst_customer_id
                LEFT JOIN azst_sku_variant_info v ON c.azst_cart_variant_id = v.id
                LEFT JOIN azst_products p ON c.azst_cart_product_id = p.id
                ORDER BY azst_cart_added_on DESC
              `;

  const variantImageBaseUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/images/product/variantimage/`;

  const productImageBaseUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/images/product/`;

  const result = await db(query, [variantImageBaseUrl, productImageBaseUrl]);

  res.status(200).json(result);
});

module.exports = {
  getCartData,
  removeFromCart,
  abandonmentCart,
};
