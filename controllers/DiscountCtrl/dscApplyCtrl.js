const db = require('../../Database/dbconfig');
const moment = require('moment');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { calculateCartTotalValue } = require('../../Utils/offerperecentageCal');

exports.applyDiscountByCode = catchAsync(async (req, res, next) => {
  const { discountCode } = req.body;
  const customerId = req.empId;

  if (!discountCode) {
    return next(new AppError('Discount Code is required', 400));
  }

  req.body = { customerId, discountCode, discountType: 'Manual' };
  next();
});

// const calculateCartTotalValue = (cartList) => {
//   // Validate that cartList is not empty or null
//   if (!Array.isArray(cartList) || cartList.length === 0) return 0;

//   const cartTotal = cartList.reduce((total, item) => {
//     const itemPrice =
//       item.is_varaints_aval === 1
//         ? parseFloat(item.offer_price)
//         : parseFloat(item.price);
//     const itemQuantity = parseInt(item.azst_cart_quantity);
//     return total + itemPrice * itemQuantity;
//   }, 0);

//   return cartTotal;
// };

const percentageCalculator = (total, percent) =>
  (total * parseFloat(percent)) / 100;

const flatCalculator = (total, value) => Math.min(total, parseFloat(value));

const getCollectionProducts = async (collectionIds) => {
  // Ensure that collectionIds is an array
  let idsArray = JSON.parse(collectionIds);
  if (typeof idsArray === 'string') {
    idsArray = JSON.parse(idsArray);
  }
  // Use Promise.all to handle multiple async operations
  const products = await Promise.all(
    idsArray.map(async (id) => {
      const query = `SELECT pd.id AS productId ,IFNULL(sku.id, 0) AS variantId
                      FROM azista_store.azst_products as pd
                      LEFT JOIN azst_sku_variant_info as sku ON pd.id = sku.product_id
                      WHERE JSON_CONTAINS(collections, '${id}', '$');`;

      const result = await db(query);
      return result;
    })
  );
  // Step 1: Flatten the array
  const flattenedProducts = products.flat();
  // Step 2: Filter unique products based on productId and variantId
  const uniqueProducts = flattenedProducts.filter(
    (product, index, self) =>
      index ===
      self.findIndex(
        (p) =>
          p.productId === product.productId && p.variantId === product.variantId
      )
  );
  return uniqueProducts; // Return unique product ids
};

const deleteNonDiscountProductsFromCart = async (cart, remainProducts) => {
  const getCartIds = [];

  // Get matching cart IDs
  remainProducts.forEach((p) => {
    const crp = cart.find(
      (cp) =>
        p.productId == cp.azst_cart_product_id &&
        p.variantId == cp.azst_cart_variant_id
    );

    if (crp) getCartIds.push(crp.azst_cart_id);
  });

  // Create an array of promises to delete discount products from the cart
  const deletePromises = getCartIds.map(async (cartId) => {
    const removeDscProducts = `DELETE FROM azst_cart_tbl 
                                WHERE azst_cart_dsc_by_ids IS NOT NULL 
                                AND azst_cart_dsc_by_ids != '' 
                                AND JSON_CONTAINS(azst_cart_dsc_by_ids, ?, '$');
                                `;

    const id = `${cartId}`; // Ensure it's passed as valid JSON
    // Execute the database query
    await db(removeDscProducts, [id]);

    const query =
      'UPDATE azst_cart_tbl SET azst_cart_product_type = ? , azst_cart_dsc_amount = ?, azst_cart_dsc_code = ?, azst_cart_dsc_by_ids= ? WHERE azst_cart_id = ?';
    const values = [null, null, null, null, cartId];
    await db(query, values);
  });

  // Wait for all delete operations to complete
  await Promise.all(deletePromises);
};

const findProductsInCartandNonCart = async (cart, products, minBuyQty) => {
  const inCartProducts = [];
  const remainProducts = [];

  products.forEach((p) => {
    const crp = cart.find(
      (cp) =>
        p.productId == cp.azst_cart_product_id &&
        p.variantId == cp.azst_cart_variant_id &&
        parseInt(cp.azst_cart_quantity) >= minBuyQty
    );

    if (crp) {
      inCartProducts.push(crp); // push the product, not the cart item
    } else {
      remainProducts.push(p);
    }
  });
  await deleteNonDiscountProductsFromCart(cart, remainProducts);
  return { inCartProducts, remainProducts };
};

const getCollectionDiscountProducts = async (
  cart,
  buy_x_product_id,
  minBuyQty
) => {
  const products = await getCollectionProducts(buy_x_product_id);
  return findProductsInCartandNonCart(cart, products, minBuyQty);
};

const fnDiscountProducts = (cart, buy_x_product_id, minBuyQty) => {
  // Convert the string to an array
  let products = JSON.parse(buy_x_product_id);
  if (typeof products === 'string') {
    products = JSON.parse(products);
  }
  // Filter products in the cart based on productId, variantId, and minimum quantity
  return findProductsInCartandNonCart(cart, products, minBuyQty);
};

const getXDiscountProducts = async (discount, cart) => {
  const { x_product_type, buy_x_product_id, min_buy_x_qty } = discount;
  // Case where the discount is applied based on collection
  if (x_product_type === 'collection') {
    return getCollectionDiscountProducts(cart, buy_x_product_id, min_buy_x_qty);
  } else {
    // Case where discount is applied based on specific product & variant IDs
    return fnDiscountProducts(cart, buy_x_product_id, min_buy_x_qty);
  }
};

const getYDiscountProducts = async (discount, cart) => {
  const { y_product_type, get_y_product_id } = discount;
  // Case where the discount is applied based on collection
  if (y_product_type === 'collection') {
    return getCollectionDiscountProducts(cart, get_y_product_id, 1);
  } else {
    // Case where discount is applied based on specific product IDs
    return fnDiscountProducts(cart, get_y_product_id, 1);
  }
};

const updateProductDaiscountIncart = async (id, amount, code, buyProdutIds) => {
  const query =
    'UPDATE azst_cart_tbl SET azst_cart_product_type = ? , azst_cart_dsc_amount = ?, azst_cart_dsc_code = ?, azst_cart_dsc_by_ids= ? WHERE azst_cart_id = ?';
  const values = ['dsc', amount, code, buyProdutIds, id];
  await db(query, values);
  return;
};

const getAddedProdctData = async (productId, variantId) => {
  const query = `
                SELECT
                    p.id as azst_cart_product_id,
                    IFNULL(v.id , 0) as azst_cart_variant_id,
                    p.product_main_title,
                    p.product_url_title,
                    p.min_cart_quantity,
                    p.max_cart_quantity,
                    v.variant_image,
                    p.compare_at_price AS product_compare_at_price,            
                    p.price,
                    v.compare_at_price AS variant_compare_at_price,
                    v.offer_price,
                    v.offer_percentage,
                    p.image_src,
                    p.is_varaints_aval,
                    v.option1,
                    v.option2,
                    v.option3
                FROM azst_products p
                LEFT JOIN 
                    azst_sku_variant_info v 
                    ON p.id = v.product_id AND v.id = ?
                WHERE p.id = ?;`;

  // Assuming `db` returns an array where the first element is the result
  const [result] = await db(query, [variantId, productId]);
  return result;
};

const addProductsToCart = async (products, maxQty, customerId, sessionId) => {
  const query = `INSERT INTO azst_cart_tbl (azst_cart_product_id,
                      azst_cart_variant_id,
                      azst_cart_quantity,
                      azst_customer_id,
                      azst_session_id
                    ) VALUES (?, ?, ?, ?, ?)`;

  const addedProducts = [];

  // Use Promise.all to execute all insertions in parallel
  await Promise.all(
    products.map(async (product) => {
      const { productId, variantId } = product;
      const values = [productId, variantId, maxQty, customerId, sessionId];

      // Assuming db is a function that returns a promise
      const result = await db(query, values);
      if (result.affectedRows > 0) {
        const product = await getAddedProdctData(productId, variantId);
        addedProducts.push({
          ...product,
          azst_cart_id: result.insertId,
          azst_cart_quantity: maxQty,
          azst_cart_product_type: 'dsc',
        });
      }
    })
  );

  return addedProducts;
};

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

  return { discountAmount, message, newCart: cart };
};

const calculateProductAmountDiscount = async (discount, cart) => {
  const { code, type, value, max_get_y_qty } = discount;

  const { inCartProducts } = await getXDiscountProducts(discount, cart);

  let discountAmount = 0;
  let message = '';

  if (inCartProducts.length === 0) {
    return { discountAmount, message: 'No discount products' };
  }

  const updatedNewCartProducts = [];

  const remainProducts = cart.filter(
    (cp) =>
      !inCartProducts.some(
        (product) => product.azst_cart_id === cp.azst_cart_id
      )
  );

  if (type === 'percentage') {
    for (let p of inCartProducts) {
      const total = calculateCartTotalValue([
        {
          ...p,
          azst_cart_quantity: Math.min(
            max_get_y_qty,
            parseInt(p.azst_cart_quantity)
          ),
        },
      ]);

      const amount = percentageCalculator(total, value);

      updatedNewCartProducts.push({
        ...p,
        azst_cart_product_type: 'dsc',
        azst_cart_dsc_amount: parseFloat(amount),
      });
      await updateProductDaiscountIncart(p.azst_cart_id, amount, code, '');
      discountAmount += amount;
    }
  } else {
    for (let p of inCartProducts) {
      const total = calculateCartTotalValue([p]);
      const amount = flatCalculator(total, value);
      updatedNewCartProducts.push({
        ...p,
        azst_cart_product_type: 'dsc',
        azst_cart_dsc_amount: parseFloat(amount),
      });
      await updateProductDaiscountIncart(
        p.azst_cart_id,
        amount,
        code,
        buyProdutIds
      );
      discountAmount += amount;
    }
  }

  return {
    discountAmount,
    message,
    newCart: [...updatedNewCartProducts, ...remainProducts],
  };
};

const calculateBuyXGetYDiscount = async (
  discount,
  cart,
  customerId,
  sessionId
) => {
  const { code, type, value, max_get_y_qty } = discount;

  const { inCartProducts } = await getXDiscountProducts(discount, cart);

  if (inCartProducts.length === 0) {
    return { discountAmount: 0, message: 'No discount products' };
  }
  const buyProdutIds = inCartProducts.map((p) => p.azst_cart_id);

  // calculate the discount on y products
  const cProducts = await getYDiscountProducts(discount, cart);

  const YdiscountProducts = cProducts.inCartProducts;
  const toAddCart = cProducts.remainProducts;

  let newCartProducts = [];
  if (toAddCart.length > 0) {
    newCartProducts = await addProductsToCart(
      toAddCart,
      max_get_y_qty,
      customerId,
      sessionId
    );
  }

  const allYproducts = [...YdiscountProducts, ...newCartProducts];

  const updatedNewCartProducts = [];

  let discountAmount = 0;
  let message = '';

  if (type === 'percentage') {
    for (let p of allYproducts) {
      const total = calculateCartTotalValue([
        {
          ...p,
          azst_cart_quantity: Math.min(
            parseInt(max_get_y_qty),
            parseInt(p.azst_cart_quantity)
          ),
        },
      ]);
      const amount = percentageCalculator(total, value);
      if (newCartProducts.length > 0) {
        newCartProducts.forEach((product) => {
          if (p.azst_cart_id === product.azst_cart_id) {
            updatedNewCartProducts.push({
              ...product,
              azst_cart_product_type: 'dsc',
              azst_cart_dsc_amount: amount,
            });
          }
        });
        await updateProductDaiscountIncart(
          p.azst_cart_id,
          amount,
          code,
          JSON.stringify(buyProdutIds)
        );
      }
      discountAmount += amount;
    }
  } else {
    for (let p of allYproducts) {
      const total = calculateCartTotalValue([p]);
      const amount = flatCalculator(total, value);
      if (newCartProducts.length > 0) {
        newCartProducts.forEach((product) => {
          if (p.azst_cart_id === product.azst_cart_id) {
            updatedNewCartProducts.push({
              ...product,
              azst_cart_product_type: 'dsc',
              azst_cart_dsc_amount: amount,
            });
          }
        });
        await updateProductDaiscountIncart(
          p.azst_cart_id,
          amount,
          code,
          JSON.stringify(buyProdutIds)
        );
      }

      discountAmount += amount;
    }
  }

  return {
    discountAmount,
    newCart: [
      ...inCartProducts,
      ...YdiscountProducts,
      ...updatedNewCartProducts,
    ],
    message,
  };
};

exports.myDiscounts = catchAsync(async (req, res, next) => {
  const {
    customerId,
    discountCode,
    discountType = 'Automatic',
    cartList,
    sessionId,
    similarProducts,
  } = req.body;

  if (customerId === '' || !cartList) {
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
                          LEFT JOIN azst_cus_dsc_mapping_tbl as cdm ON ds.code = cdm.azst_cdm_dsc_id  AND cdm.azst_cdm_cus_id = ?
                          WHERE  method = ?
                              AND status = 1
                              AND (eligible_customers = 'all'
                                  OR JSON_CONTAINS(eligible_customers, JSON_ARRAY(?)))
                              AND ? BETWEEN start_time AND end_time ${
                                discountCode ? 'AND code = ?' : ''
                              }
                          GROUP BY
                            cdm.azst_cdm_dsc_id
                          HAVING
                            discount_used < ds.usage_count
                          ;`;
  // ds.id
  const values = [customerId, discountType, customerId, today];
  if (discountCode) values.push(discountCode);

  await db("SET SESSION sql_mode = ''");
  const discounts = await db(discountQuery, values);

  // If manual discount is requested and none are found, return an error
  if (discountType === 'Manual' && discounts.length === 0) {
    return next(new AppError('Invalid or expired discount code.', 400));
  }

  let totalDiscountAmount = 0;
  let discountMessage = '';
  let discountCodes = [];

  const cart = typeof cartList === 'string' ? JSON.parse(cartList) : cartList;
  let newCart = [];

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
        result = await calculateBuyXGetYDiscount(
          discount,
          cart,
          customerId,
          sessionId
        );
        break;
      default:
        result.message = 'No valid discount found.';
        break;
    }
    if (result.discountAmount > 0) {
      discountCodes.push(discount.code);
    }
    totalDiscountAmount += result.discountAmount;
    newCart = result.newCart ? result.newCart : [];
    if (result.message) discountMessage = result.message; // Last message will be displayed
  }

  newCart = newCart.length > 0 ? newCart : cart;
  const cartTotal = calculateCartTotalValue(newCart);

  const discountAmount = Math.min(cartTotal, totalDiscountAmount).toFixed(2);
  res.status(200).json({
    cart_products: newCart,
    cart_total: cartTotal,
    discountCodes,
    discountAmount,
    message: discountMessage,
    similarProducts,
  });
});
