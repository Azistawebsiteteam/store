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

// const { items, discountCode } = req.body;

// let totalAmount = items.reduce(
//   (sum, item) => sum + item.price * item.quantity,
//   0
// );
// let discount = 0;

// if (discountCode === 'DISCOUNT10') {
//   discount = 0.1 * totalAmount;
// }

// let finalAmount = totalAmount - discount;

// // Insert order into MySQL
// const orderQuery = `INSERT INTO orders (totalAmount, discount, finalAmount) VALUES (?, ?, ?)`;
// connection.query(
//   orderQuery,
//   [totalAmount, discount, finalAmount],
//   (error, results) => {
//     if (error) throw error;

//     const orderId = results.insertId;

//     // Insert order items into MySQL
//     const orderItemsQuery = `INSERT INTO orderItems (orderId, productId, name, price, quantity) VALUES ?`;
//     const orderItemsData = items.map((item) => [
//       orderId,
//       item.productId,
//       item.name,
//       item.price,
//       item.quantity,
//     ]);

//     connection.query(orderItemsQuery, [orderItemsData], (err) => {
//       if (err) throw err;

//       // Retrieve the complete order with items
//       const getOrderQuery = `
//         SELECT * FROM orders WHERE id = ?;
//         SELECT * FROM orderItems WHERE orderId = ?;
//       `;

//       connection.query(getOrderQuery, [orderId, orderId], (err, results) => {
//         if (err) throw err;

//         const order = results[0][0];
//         order.items = results[1];

//         res.send(order);
//       });
//     });
//   }
// );

const calculateNormalDiscount = async (discountCode, products, next) => {
  const query = `SELECT * FROM azst_discount_tbl WHERE azst_dsc_code = ?`;
  const discountResult = await db(query, [discountCode]);

  if (!discountResult.length) {
    return next(new AppError('Invalid discount', 400));
  }

  const {
    azst_dsc_prc_value,
    azst_dsc_usage_cnt,
    azst_dsc_apply_qty,
    azst_dsc_mode,
    azst_dsc_value,
    azst_dsc_apply_mode,
    azst_dsc_prc_mode,
    azst_dsc_apply_id,
  } = discountResult[0];
  console.log(discountResult[0]);

  let product;
  if (azst_dsc_apply_mode === 'product') {
    console.log(products, 'product based');
    product = products.find((p) => p.product_id === azst_dsc_apply_id);
  } else {
    product = products.find((p) =>
      JSON.parse(p.collection_id).includes(azst_dsc_apply_id)
    );
  }

  if (!product) {
    return next(new AppError('You are not eligible for this discount', 400));
  }

  const totalAmt = products.reduce((acc, p) => acc + p.quantity * p.price, 0);

  if (
    azst_dsc_prc_mode === 'quantity' &&
    product.quantity < azst_dsc_prc_value
  ) {
    return next(
      new AppError(
        `Please add ${
          azst_dsc_prc_value - product.quantity
        } more to get the discount`,
        400
      )
    );
  }

  if (azst_dsc_prc_mode === 'amount' && totalAmt < azst_dsc_prc_value) {
    return next(
      new AppError(
        `Please add ${
          azst_dsc_prc_value - totalAmt
        } more value get the discount`,
        400
      )
    );
  }

  let totalPrice = 0;

  let discountAmt = 0;
  if (azst_dsc_mode === 'amount') {
    discountAmt = azst_dsc_value;
    totalPrice = totalAmt - azst_dsc_value;
  } else {
    const applyQty = Math.min(product.quantity, azst_dsc_apply_qty);
    discountAmt = ((product.price * applyQty) / 100) * azst_dsc_value;
    totalPrice = totalAmt - discountAmt;
  }

  return { totalAmt, discountAmt, totalPrice };
};

const calculateXYDiscount = async (discountCode, products, next) => {
  const query = `SELECT * FROM azst_buy_x_get_y_discount_tbl WHERE azst_x_y_dsc_id = ?`;
  const discountResult = await db(query, [discountCode]);

  if (!discountResult.length) {
    return next(new AppError('Invalid discount', 400));
  }

  const discount = discountResult[0];
  const eligibleProducts = discount.azst_x_y_dsc_applid.split(',');

  const applicableProducts = products.filter((p) => {
    if (discount.azst_x_y_dsc_applyto === 'product') {
      return eligibleProducts.includes(p.product_id);
    } else {
      return eligibleProducts.includes(p.collection_id);
    }
  });

  const totalEligibleQty = applicableProducts.reduce(
    (acc, p) => acc + p.quantity,
    0
  );

  if (totalEligibleQty < discount.azst_x_y_dsc_min_qty) {
    return next(
      new AppError(
        `Please add more products to meet the minimum quantity for the discount`,
        400
      )
    );
  }

  let discountValue = 0;
  if (discount.azst_x_y_dsc_type === 'percentage') {
    discountValue =
      (totalEligibleQty * products[0].price * discount.azst_x_y_dsc_value) /
      100;
  } else if (discount.azst_x_y_dsc_type === 'amount') {
    discountValue = discount.azst_x_y_dsc_value;
  } else if (discount.azst_x_y_dsc_type === 'free') {
    discountValue = products[0].price;
  }

  const totalAmt = products.reduce((acc, p) => acc + p.quantity * p.price, 0);
  const totalPrice = totalAmt - discountValue;

  return totalPrice;
};

exports.getDiscounts = catchAsync(async (req, res, next) => {
  const { discountCode, discountType, products } = req.body;
  const cartProducts = JSON.parse(products);
  let billingDetails;

  if (discountType === 'discount') {
    billingDetails = await calculateNormalDiscount(
      discountCode,
      cartProducts,
      next
    );
  } else if (discountType === 'xydiscount') {
    billingDetails = await calculateXYDiscount(
      discountCode,
      cartProducts,
      next
    );
  } else {
    return res.status(400).json({ error: 'Invalid discountType' });
  }

  if (billingDetails === undefined) return; // next() should have been called already if there's an error

  res.status(200).json(billingDetails);
});

// azst_dsc_id,
//   azst_dsc_title,
//   azst_dsc_code,
//   azst_dsc_mode,
//   azst_dsc_value,
// azst_dsc_apply_mode,
// azst_dsc_apply_id,
// azst_dsc_prc_value,
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
