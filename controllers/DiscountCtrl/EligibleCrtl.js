const db = require('../../Database/dbconfig');
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
      azst_x_y_dsc_applyto AS azst_dsc_apply_mode,t
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

exports.applyDiscountByCode = catchAsync(async (req, res, next) => {
  const { discountCode, cartList } = req.body;
  const customerId = req.empId;

  req.body = { customerId, discountCode, discountType: 'Manual', cartList };
  next();
});

const calculateCartTotalValue = (cartList) => {
  // Validate that cartList is not empty or null
  if (!Array.isArray(cartList) || cartList.length === 0) return 0;

  const cartTotal = cartList.reduce((total, item) => {
    const itemPrice = parseFloat(item.offer_price ?? item.price);
    const itemQuantity = parseInt(item.azst_cart_quantity);
    return total + itemPrice * itemQuantity;
  }, 0);

  return cartTotal;
};

const percentageCalculator = (total, percent) =>
  (total * parseInt(percent)) / 100;

const flatCalculator = (total, value) => Math.min(total, parseFloat(value));

const calculateCartAmountDiscount = (discount, cart) => {
  const { min_cart_value, type, value } = discount;
  const cartTotal = calculateCartTotalValue(cart);

  let discountAmount = 0;
  let message = '';

  // Apply discount only if cart total exceeds the minimum value
  if (cartTotal >= parseInt(min_cart_value) || min_cart_value === null) {
    if (type === 'percentage') {
      discountAmount = percentageCalculator(cartTotal, value);
    } else {
      discountAmount = flatCalculator(cartTotal, value); // Ensure discount doesn't exceed cart total
    }
  } else {
    const amountNeeded = parseInt(min_cart_value) - cartTotal;
    message = `Add ${amountNeeded.toFixed(2)}  more to get the discount.`;
  }

  return { discountAmount, message };
};

const getCollectionProducts = async (collectionIds) => {
  // Ensure that collectionIds is an array
  const idsArray = JSON.parse(collectionIds);

  // Use Promise.all to handle multiple async operations
  const products = await Promise.all(
    idsArray.map(async (id) => {
      const query = `SELECT id
                      FROM azista_store.azst_products
                      WHERE JSON_CONTAINS(collections, '${id}', '$');`;

      const result = await db(query);
      return result.map((p) => p.id);
    })
  );
  // Flatten the array and get unique ids
  const uniqueProducts = [...new Set(products.flat())];
  return uniqueProducts; // Return unique product ids
};

const getXDiscountProducts = async (discount, cart) => {
  const { x_product_type, buy_x_product_id, min_buy_x_qty } = discount;
  let discountProducts = [];

  // Case where the discount is applied based on collection
  if (x_product_type === 'collection') {
    const products = await getCollectionProducts(buy_x_product_id);
    discountProducts = cart.filter(
      (p) =>
        products.includes(p.azst_cart_product_id) && // Only include products in the collection
        p.azst_cart_quantity >= min_buy_x_qty // Ensure min quantity condition is met
    );
  } else {
    // Case where discount is applied based on specific product IDs
    const products = JSON.parse(buy_x_product_id);
    discountProducts = cart.filter(
      (p) =>
        products.includes(p.azst_cart_product_id) &&
        p.azst_cart_quantity >= min_buy_x_qty
    );
  }
  return discountProducts;
};

const calculateProductAmountDiscount = async (discount, cart) => {
  const { type, value, max_get_y_qty } = discount;

  const discountProducts = await getXDiscountProducts(discount, cart);
  let discountAmount = 0;
  let message = '';
  if (discountProducts.length === 0) {
    return { discountAmount, message: 'No discount products' };
  }

  if (type === 'percentage') {
    discountProducts.forEach((p) => {
      const total = calculateCartTotalValue([
        {
          ...p,
          azst_cart_quantity: Math.min(
            max_get_y_qty,
            parseFloat(p.azst_cart_quantity)
          ),
        },
      ]);
      discountAmount += percentageCalculator(total, value);
    });
  } else {
    discountProducts.forEach((p) => {
      const total = calculateCartTotalValue([p]);
      discountAmount += flatCalculator(total, value);
    });
  }

  return { discountAmount, message };
};

const getYDiscountProducts = async (discount, cart) => {
  const { y_product_type, get_y_product_id } = discount;
  let YdiscountProducts = [];
  let products = [];
  // Case where the discount is applied based on collection
  if (y_product_type === 'collection') {
    products = await getCollectionProducts(get_y_product_id);
    YdiscountProducts = cart.filter(
      (p) =>
        products.includes(p.azst_cart_product_id) && // Only include products in the collection
        p.azst_cart_quantity >= 1 // Ensure min quantity condition is met
    );
  } else {
    // Case where discount is applied based on specific product IDs
    products = JSON.parse(get_y_product_id);
    YdiscountProducts = cart.filter(
      (p) =>
        products.includes(p.azst_cart_product_id) && p.azst_cart_quantity >= 1
    );
  }
  return { YdiscountProducts, products };
};

const addProductsToCart = async (products) => {
  // Corrected SELECT query
  const productsQuery = `SELECT * FROM azst_products WHERE id IN (?)`;

  // Execute the query to get the products from the database using the product IDs
  const productsFromDb = await db(productsQuery, [products]); // Pass products as an array

  console.log(productsFromDb);

  // // Prepare an INSERT query for adding the products to the cart
  // const insertQuery = `INSERT INTO azst_cart_tbl (
  //                         azst_cart_product_id,
  //                         azst_cart_variant_id,
  //                         azst_cart_quantity,
  //                         azst_customer_id,
  //                         azst_session_id
  //                     ) VALUES (?, ?, ?, ?, ?)`;

  // // Execute insert for each product (this assumes you have the necessary values for each field)
  // productsFromDb.forEach((product) => {
  //  await db(insertQuery, [
  //     product.azst_cart_product_id, // Product ID from DB
  //     product.azst_cart_variant_id, // Variant ID from DB
  //     product.azst_cart_quantity, // Assuming quantity is available
  //     product.azst_customer_id, // Assuming customer ID is available
  //     product.azst_session_id, // Assuming session ID is available
  //   ]);
  // });
};

const calculateBuyXGetYDiscount = async (discount, cart) => {
  const {
    type,
    value,
    x_product_type,
    buy_x_product_id,
    min_buy_x_qty,
    y_product_type,
    get_y_product_id,
    max_get_y_qty,
  } = discount;

  const discountProducts = await getXDiscountProducts(discount, cart);

  if (discountProducts.length === 0) {
    return { discountAmount: 0, message: 'No discount products' };
  }

  // calculate the discount on y products
  const { YdiscountProducts, products } = await getYDiscountProducts(
    discount,
    cart
  );

  const addToCartProducts = products.filter(
    (product) =>
      !YdiscountProducts.some((p) => p.azst_cart_product_id === product)
  );

  const newCartProducts = addProductsToCart([79, 80]);

  return { discountAmount: 0, message: 'working on  x-y' };
};

exports.myDiscounts = catchAsync(async (req, res, next) => {
  const {
    customerId,
    discountCode,
    discountType = 'Automatic',
    cartList,
  } = req.body;

  if (!customerId || !cartList) {
    return next(new AppError('Customer ID and Cart List are required.', 400));
  }

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const discountQuery = `SELECT
                            dc.discount_id ,
                            title,
                            code,
                            type,
                            value,
                            scope,
                            min_cart_value,
                            x_product_type,
                            buy_x_product_id,
                            min_buy_x_qty,
                            y_product_type,
                            get_y_product_id,
                            max_get_y_qty,
                            usage_count,
                            COUNT(cdm.azst_cdm_dsc_id) AS discount_used
                          FROM  azst_discounts_tbl as ds
                          LEFT JOIN azst_discount_conditions as dc ON ds.id = dc.discount_id
                          LEFT JOIN azst_cus_dsc_mapping_tbl as cdm ON ds.id = cdm.azst_cdm_dsc_id  AND cdm.azst_cdm_cus_id = ?
                          WHERE  method = ?
                              AND status = 1
                              AND (eligible_customers = 'all'
                                  OR JSON_CONTAINS(eligible_customers, JSON_ARRAY(?)))
                              AND ? BETWEEN start_time AND end_time ${
                                discountCode ? 'AND code = ?' : ''
                              }
                          GROUP BY
                            cdm.azst_cdm_dsc_id,
                            dc.discount_id ,
                            ds.title,
                            ds.code,
                            ds.type,
                            ds.value,
                            dc.scope,
                            dc.min_cart_value,
                            dc.x_product_type,
                            dc.buy_x_product_id,
                            dc.min_buy_x_qty,
                            dc.y_product_type,
                            dc.get_y_product_id,
                            dc.max_get_y_qty,
                            ds.usage_count
                          HAVING
                            discount_used < ds.usage_count
                          ;`;

  const values = [customerId, discountType, customerId, today];
  if (discountCode) values.push(discountCode);
  const discounts = await db(discountQuery, values);

  // If manual discount is requested and none are found, return an error
  if (discountType === 'Manual' && discounts.length === 0) {
    return next(new AppError('Invalid or expired discount code.', 400));
  }

  let totalDiscountAmount = 0;
  let discountMessage = '';

  const cart = JSON.parse(cartList);

  for (let discount of discounts) {
    let result = { discountAmount: 0, message: '' };

    switch (discount.scope) {
      case 'cart':
        result = calculateCartAmountDiscount(discount, cart);
        break;

      case 'product':
        result = await calculateProductAmountDiscount(discount, cart);
        break;

      case 'buy_x_get_y':
        result = await calculateBuyXGetYDiscount(discount, cart);
        break;
      default:
        result.message = 'No valid discount found.';
        break;
    }

    totalDiscountAmount += result.discountAmount;
    if (result.message) discountMessage = result.message; // Last message will be displayed
  }

  const cartTotal = calculateCartTotalValue(cart);
  const discountAmount = Math.min(cartTotal, totalDiscountAmount).toFixed(2);
  res.status(200).json({
    discountCode,
    discountAmount,
    message: discountMessage,
  });
});

// {
//             "azst_cart_id": 126,
//             "azst_cart_product_id": 79,
//             "azst_cart_variant_id": "0",
//             "azst_cart_quantity": "5",
//             "product_main_title": "DEFEND99",
//             "product_url_title": "DEFEND99-Single-Color-Self-Sanitizing-Reusable-Washable-Face-Mask",
//             "min_cart_quantity": 5,
//             "max_cart_quantity": 100,
//             "variant_image": "http://192.168.214.149:5018/api/images/product/variantimage/",
//             "product_compare_at_price": "530",
//             "price": "400",
//             "compare_at_price": null,
//             "offer_price": null,
//             "offer_percentage": null,
//             "image_src": "http://192.168.214.149:5018/api/images/product/1724924285356-D99FMSC-Beige-P1.jpg",
//             "is_varaints_aval": 0,
//             "option1": null,
//             "option2": null,
//             "option3": null,
//             "avbl_quantity": "300"
//         }

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

// const discountQuery = `SELECT
//                           title,
//                           code,
//                           type,
//                           value,
//                           scope,
//                           min_cart_value,
//                           x_product_type,
//                           buy_x_product_id,
//                           min_buy_x_qty,
//                           y_product_type,
//                           get_y_product_id,
//                           max_get_y_qty,
//                           usage_count,
//                           COUNT(cdm.azst_cdm_dsc_id) AS discount_used
//                         FROM  azst_discounts_tbl as ds
//                         LEFT JOIN azst_discount_conditions as dc ON ds.id = dc.discount_id
//                         LEFT JOIN azst_cus_dsc_mapping_tbl as cdm ON ds.id = cdm.azst_cdm_dsc_id  AND cdm.azst_cdm_cus_id = ?
//                         WHERE method =
//                             AND status = 1
//                             AND (eligible_customers = 'all'
//                                 OR JSON_CONTAINS(eligible_customers, JSON_ARRAY(?)))
//                             AND ? BETWEEN start_time AND end_time
//                         GROUP BY
//                           cdm.azst_cdm_dsc_id,
//                           ds.title,
//                           ds.code,
//                           ds.type,
//                           ds.value,
//                           dc.scope,
//                           dc.min_cart_value,
//                           dc.x_product_type,
//                           dc.buy_x_product_id,
//                           dc.min_buy_x_qty,
//                           dc.y_product_type,
//                           dc.get_y_product_id,
//                           dc.max_get_y_qty,
//                           ds.usage_count
//                         HAVING
//                           discount_used < ds.usage_count
//                         ;`;

// const today = moment().format('YYYY-MM-DD HH:mm:ss');

// const discountQuery = `SELECT
//                           title,
//                           code,
//                           type,
//                           value,
//                           scope,
//                           min_cart_value,
//                           x_product_type,
//                           buy_x_product_id,
//                           min_buy_x_qty,
//                           y_product_type,
//                           get_y_product_id,
//                           max_get_y_qty,
//                           usage_count,
//                           COUNT(cdm.azst_cdm_dsc_id) AS discount_used
//                         FROM  azst_discounts_tbl as ds
//                         LEFT JOIN azst_discount_conditions as dc ON ds.id = dc.discount_id
//                         LEFT JOIN azst_cus_dsc_mapping_tbl as cdm ON ds.id = cdm.azst_cdm_dsc_id  AND cdm.azst_cdm_cus_id = ?
//                         WHERE code = ? AND  method = 'Manual'
//                             AND status = 1
//                             AND (eligible_customers = 'all'
//                                 OR JSON_CONTAINS(eligible_customers, JSON_ARRAY(?)))
//                             AND ? BETWEEN start_time AND end_time
//                         GROUP BY
//                           cdm.azst_cdm_dsc_id,
//                           ds.title,
//                           ds.code,
//                           ds.type,
//                           ds.value,
//                           dc.scope,
//                           dc.min_cart_value,
//                           dc.x_product_type,
//                           dc.buy_x_product_id,
//                           dc.min_buy_x_qty,
//                           dc.y_product_type,
//                           dc.get_y_product_id,
//                           dc.max_get_y_qty,
//                           ds.usage_count
//                         HAVING
//                           discount_used < ds.usage_count
//                         ;`;
// const values = [customerId, discountCode, customerId, today];
// const [discount] = await db(discountQuery, values);

// if (!discount)
//   return next(new AppError('Invalid discount code or Expired discount', 400));
// res.status(200).json({ discount: discount });
