const db = require('../../dbconfig');
const moment = require('moment');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.getEligibleDiscounts = catchAsync(async (req, res, next) => {
  const date = moment().format('YYYY-MM-DD HH:mm:ss');
  const id = req.empId;

  // Query for azst_discount_tbl

  const query1 = `
    SELECT 
      azst_dsc_id AS discount_id,
      'discount' AS discount_use_type, 
      azst_dsc_title AS discount_title,
      azst_dsc_code AS discount_code,
      azst_dsc_mode AS discount_mode,
      azst_dsc_value AS discount_value,
      azst_dsc_apply_mode AS discount_apply_mode,
      azst_dsc_apply_id AS discount_apply_id,
      azst_dsc_prc_value AS discount_prc_value,
      azst_dsc_apply_qty AS discount_apply_qty,
      azst_dsc_usage_cnt AS max_usage_count,
      COUNT(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id) AS discount_used
    FROM
      azst_discount_tbl
    LEFT JOIN
      azst_cus_dsc_mapping_tbl
    ON
      azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_discount_tbl.azst_dsc_id
      AND azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
    WHERE
      (azst_dsc_elg_cus = 'all' OR JSON_CONTAINS(azst_dsc_elg_cus, JSON_ARRAY(?)))
      AND azst_dsc_status = 1 
      AND ? BETWEEN azst_dsc_start_tm AND azst_dsc_end_tm
    GROUP BY
      azst_dsc_id,
      azst_dsc_title,
      azst_dsc_code,
      azst_dsc_mode,
      azst_dsc_value,
      azst_dsc_apply_mode,
      azst_dsc_apply_id,
      azst_dsc_prc_value,
      azst_dsc_apply_qty,
      max_usage_count
    HAVING
      discount_used < max_usage_count;
  `;

  // Query for azst_buy_x_get_y_discount_tbl
  const query2 = `
    SELECT 
      azst_x_y_dsc_id AS discount_id,
      'xydiscount' AS discount_use_type, 
      azst_x_y_dsc_title AS discount_title,
      azst_x_y_dsc_code AS discount_code,
      azst_x_y_dsc_applyto AS discount_applyto,
      azst_x_y_dsc_applid AS discount_applid,
      azst_x_y_dsc_buy_mode AS discount_buy_mode,
      azst_x_y_dsc_min_add_qty AS discount_min_add_qty,
      azst_x_y_dsc_apply_to AS discount_apply_to,
      azst_x_y_dsc_apply_id AS discount_apply_id,
      azst_x_y_dsc_min_prc_qty AS discount_min_prc_qty,
      azst_x_y_dsc_type AS discount_type,
      azst_x_y_dsc_value AS discount_value,
      azst_x_y_dsc_max_use AS max_usage_count,
      COUNT(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id) AS discount_used
    FROM
      azst_buy_x_get_y_discount_tbl
    LEFT JOIN
      azst_cus_dsc_mapping_tbl
    ON
      azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_id
      AND azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
    WHERE
      (azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_elg_cus = 'all' OR JSON_CONTAINS(azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_elg_cus, JSON_ARRAY(?)))
      AND azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_status = 1
      AND ? BETWEEN azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_start_time AND azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_end_time
    GROUP BY
      azst_x_y_dsc_id,
      azst_x_y_dsc_title,
      azst_x_y_dsc_code,
      azst_x_y_dsc_applyto,
      azst_x_y_dsc_applid,
      azst_x_y_dsc_buy_mode,
      azst_x_y_dsc_min_add_qty,
      azst_x_y_dsc_apply_to,
      azst_x_y_dsc_apply_id,
      azst_x_y_dsc_min_prc_qty,
      azst_x_y_dsc_type,
      azst_x_y_dsc_value,
      max_usage_count
    HAVING
      discount_used < max_usage_count;
  `;

  // Execute both queries
  const [result1, result2] = await Promise.all([
    db(query1, [id, id, date]),
    db(query2, [id, id, date]),
  ]);

  // Merge results
  const mergedResults = [...result1, ...result2];

  res.status(200).json(mergedResults);
});

const getDiscountByCode = async (code, id, date) => {
  const query = `
    SELECT 
      azst_discount_tbl.*,
      COUNT(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id) AS discount_used 
    FROM 
      azst_discount_tbl
    LEFT JOIN 
      azst_cus_dsc_mapping_tbl 
    ON 
      azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_discount_tbl.azst_dsc_id 
      AND azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
    WHERE 
      azst_dsc_code = ? 
      AND (azst_dsc_elg_cus = 'all' OR JSON_CONTAINS(azst_dsc_elg_cus, JSON_ARRAY(?)))
      AND azst_dsc_status = 1 
      AND ? BETWEEN azst_dsc_start_tm AND azst_dsc_end_tm
    GROUP BY 
      azst_dsc_id
    HAVING 
      discount_used < azst_dsc_usage_cnt
  `;
  const result = await db(query, [id, code, id, date]);

  return result.length ? result[0] : null;
};

const getXyDiscountByCode = async (code, id, date) => {
  const query = `
    SELECT 
      azst_x_y_dsc_applyto AS azst_dsc_apply_mode,
      azst_x_y_dsc_applid AS azst_dsc_apply_id,
      azst_x_y_dsc_buy_mode AS azst_dsc_prc_mode,
      azst_x_y_dsc_min_add_qty AS azst_dsc_prc_value,
      azst_x_y_dsc_apply_to AS discount_apply_to,
      azst_x_y_dsc_apply_id AS discount_apply_id,
      azst_x_y_dsc_min_prc_qty AS azst_dsc_apply_qty,
      azst_x_y_dsc_type AS azst_dsc_mode,
      azst_x_y_dsc_value AS azst_dsc_value,
      azst_x_y_dsc_max_use, 
      COUNT(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id) AS discount_used 
    FROM 
      azst_buy_x_get_y_discount_tbl
    LEFT JOIN 
      azst_cus_dsc_mapping_tbl 
    ON 
      azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_id 
      AND azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
    WHERE 
      azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_code = ?
      AND (azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_elg_cus = 'all' 
      OR JSON_CONTAINS(azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_elg_cus, JSON_ARRAY(?)))
      AND azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_status = 1
      AND ? BETWEEN azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_start_time AND azst_x_y_dsc_end_time
    GROUP BY 
      azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_id
    HAVING 
      discount_used < azst_buy_x_get_y_discount_tbl.azst_x_y_dsc_max_use
  `;
  const result = await db(query, [id, code, id, date]);
  return result.length ? result[0] : null;
};

const findApplicableProduct = (discount, products) => {
  if (discount.azst_dsc_apply_mode === 'product') {
    return products.filter(
      (p) =>
        p.product_id === discount.azst_dsc_apply_id &&
        p.quantity >= discount.azst_dsc_apply_qty
    );
  }

  const discountIds = JSON.parse(discount.azst_dsc_apply_id);

  return products.filter((p) => {
    const collectionIds = Array.isArray(p.collection_id)
      ? p.collection_id
      : JSON.parse(p.collection_id);
    return (
      collectionIds.some((id) => discountIds.includes(id)) &&
      p.quantity >= discount.azst_dsc_apply_qty
    );
  });
};

const calculateTotalAmount = (products) => {
  return products.reduce((acc, p) => acc + p.quantity * p.price, 0);
};

const isEligibleForDiscount = (discount, products, next) => {
  let message = '';
  const isEligible = products.some((product) => {
    if (discount.azst_dsc_prc_mode === 'quantity') {
      message = `Please add ${
        discount.azst_dsc_prc_value - product.quantity
      } more quantity to get the discount`;
      return product.quantity >= discount.azst_dsc_prc_value;
    } else if (discount.azst_dsc_prc_mode === 'amount') {
      // here one more Doubt it on total cart amount are the perticular product amount
      message = `Please add  ${
        discount.azst_dsc_prc_value - product.quantity * product.price
      } Rs more value to get the discount`;
      return product.quantity * product.price >= discount.azst_dsc_prc_value;
    }
    return false;
  });

  if (!isEligible) {
    next(new AppError(message, 400));
  }

  return isEligible;
};

const calculateDiscountAmount = (discount, product, totalAmt) => {
  let discountAmt = 0;
  let totalPrice = 0;

  if (discount.azst_dsc_mode === 'amount') {
    discountAmt = discount.azst_dsc_value;
    totalPrice = totalAmt - discountAmt;
  } else {
    const applyQty = Math.min(product.quantity, discount.azst_dsc_apply_qty);
    discountAmt = ((product.price * applyQty) / 100) * discount.azst_dsc_value;
    totalPrice = totalAmt - discountAmt;
  }

  return { discountAmt, totalPrice };
};

const calculateXyDiscountAmount = (
  discount,
  cartProducts,
  product,
  totalAmt,
  next
) => {
  let discountAmt = 0;
  let totalPrice = totalAmt;

  const products = cartProducts.filter(
    (p) => p.product_id !== product.product_id
  );
  const discountIds = JSON.parse(discount.discount_apply_id);

  const yProducts = products.filter((p) => {
    if (discount.discount_apply_to === 'products') {
      return (
        discountIds.includes(`${p.product_id}`) &&
        p.quantity >= discount.azst_dsc_apply_qty
      );
    } else if (discount.discount_apply_to === 'collections') {
      const collectionIds = Array.isArray(p.collection_id)
        ? p.collection_id
        : JSON.parse(p.collection_id);
      return (
        collectionIds.some((id) => discountIds.includes(id)) &&
        p.quantity >= discount.azst_dsc_apply_qty
      );
    }
    return false;
  });

  if (yProducts.length) {
    return calculateDiscountAmount(discount, yProducts[0], totalAmt);
  }

  return { discountAmt, totalPrice };
};

const calculateNormalDiscount = async (
  discountCode,
  cartProducts,
  date,
  id,
  next
) => {
  try {
    const discount = await getDiscountByCode(discountCode, id, date);

    if (!discount) {
      return next(new AppError('Invalid discount', 400));
    }

    const products = findApplicableProduct(discount, cartProducts);

    if (!products.length) {
      return next(new AppError('You are not eligible for this discount', 400));
    }

    const totalAmt = calculateTotalAmount(cartProducts);

    if (!isEligibleForDiscount(discount, products, next)) {
      return;
    }

    const { discountAmt, totalPrice } = calculateDiscountAmount(
      discount,
      products[0],
      totalAmt
    );

    return { totalAmt, discountAmt, totalPrice };
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const calculateXYDiscount = async (
  discountCode,
  cartProducts,
  date,
  id,
  next
) => {
  try {
    const discount = await getXyDiscountByCode(discountCode, id, date);

    if (!discount) {
      return next(new AppError('Invalid discount', 400));
    }

    const products = findApplicableProduct(discount, cartProducts);

    if (!products.length) {
      return next(new AppError('You are not eligible for this discount', 400));
    }

    const totalAmt = calculateTotalAmount(cartProducts);

    if (!isEligibleForDiscount(discount, products, next)) {
      return;
    }

    const { discountAmt, totalPrice } = calculateXyDiscountAmount(
      discount,
      cartProducts,
      products[0],
      totalAmt,
      next
    );

    return { totalAmt, discountAmt, totalPrice };
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getDiscounts = catchAsync(async (req, res, next) => {
  const { discountCode, discountType, products } = req.body;

  const cartProducts = JSON.parse(products);
  const date = moment().format('YYYY-MM-DD HH:mm:ss');
  let billingDetails;

  if (discountType === 'discount') {
    billingDetails = await calculateNormalDiscount(
      discountCode,
      cartProducts,
      date,
      req.empId,
      next
    );
  } else if (discountType === 'xydiscount') {
    billingDetails = await calculateXYDiscount(
      discountCode,
      cartProducts,
      date,
      req.empId,
      next
    );
  } else {
    return res.status(400).json({ error: 'Invalid discountType' });
  }

  if (!billingDetails) return; // next() should have been called already if there's an error

  res.status(200).json(billingDetails);
});

//    azst_dsc_title,
//    azst_dsc_code,
//    azst_dsc_mode,
//    azst_dsc_value,
//    azst_dsc_apply_mode,
//    azst_dsc_apply_id,
//    azst_dsc_prc_value,
//    azst_dsc_apply_qty,
//    azst_dsc_usage_cnt;

//   azst_dsc_id,
//   azst_dsc_title,
//   azst_dsc_code,
//   azst_dsc_mode,
//   azst_dsc_value,
//   azst_dsc_apply_mode,
//   azst_dsc_apply_id,
//   azst_dsc_prc_value,
//   azst_dsc_elg_cus,
//   azst_dsc_apply_qty,
//   azst_dsc_usage_cnt,
//   azst_dsc_start_tm,
//   azst_dsc_end_tm,
//   azst_dsc_cr_by,
//   azst_dsc_up_by,
//   azst_dsc_cr_on,
//   azst_dsc_up_on,
//   azst_dsc_status,
//   azst_dsc_prc_mode;

//   azst_x_y_dsc_id,
//   azst_x_y_dsc_title,
//   azst_x_y_dsc_code, discount code
//   azst_x_y_dsc_applyto, products or collections
//   azst_x_y_dsc_applid,  product or collection id's
//   azst_x_y_dsc_buy_mode, quantity or amount
//   azst_x_y_dsc_buy_value, quantity or amount value
//   azst_x_y_dsc_min_qty,  need to add minimum quantity to cart
//   azst_x_y_dsc_type,  percentage , amount or free
//   azst_x_y_dsc_value, value of selected filed above
//   azst_x_y_dsc_apply_to, product or collection
//   azst_x_y_dsc_apply_id, product or collection id's
//   azst_x_y_dsc_max_use, one customer can you this time
//   azst_x_y_dsc_elg_cus, customer's id's to get discount
//   azst_x_y_dsc_start_time, discount start time
//   azst_x_y_dsc_end_time; discount end time

//   azst_x_y_dsc_create_on,
//   azst_x_y_dsc_create_by,
//   azst_x_y_dsc_update_on,
//   azst_x_y_dsc_update_by,
//   azst_x_y_dsc_status,
