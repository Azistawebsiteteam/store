const db = require('../../Database/dbconfig');
const moment = require('moment');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

// Helper functions (calculators for discounts and cart total)

// Function to calculate percentage discounts
const percentageCalculator = (total, value) => {
  return (total * value) / 100;
};

// Function to calculate flat discount
const flatCalculator = (total, value) => {
  return total - value > 0 ? value : total;
};

// Function to calculate the total value of products in a cart
const calculateCartTotalValue = (cart) => {
  return cart.reduce(
    (acc, item) => acc + item.azst_cart_quantity * item.price,
    0
  );
};

// Update product discount in cart (stub function)
const updateProductDaiscountIncart = async (cartId, amount) => {
  try {
    // Assuming this function updates the product discount in cart based on ID and discount amount
    const query =
      'UPDATE azst_cart_tbl SET azst_cart_product_type = ? , azst_cart_dsc_amount = ? WHERE azst_cart_id =?';
    const values = ['dsc', amount, cartId];
    await db(query, values);
  } catch (error) {
    throw new AppError('Error updating product discount in cart.', 500);
  }
};

// Get X-discount products (stub function)
const getXDiscountProducts = async (discount, cart) => {
  // This would retrieve products eligible for the discount based on "Buy X" condition
  return { inCartProducts: cart.filter((p) => p.discountEligible) }; // Example filtering
};

// Get Y-discount products (stub function)
const getYDiscountProducts = async (discount, cart) => {
  // This would retrieve products for the "Get Y" part of the discount
  return {
    inCartProducts: cart.filter((p) => p.getYEligible),
    remainProducts: [],
  }; // Example filtering
};

// Add products to cart (stub function)
const addProductsToCart = async (products, maxQty, customerId, sessionId) => {
  // Add products to the cart logic
  return products.map((p) => ({
    ...p,
    azst_cart_quantity: Math.min(p.azst_cart_quantity, maxQty),
  }));
};

// Apply discount by code
exports.applyDiscountByCode = catchAsync(async (req, res, next) => {
  try {
    const { discountCode, cartList } = req.body;
    const customerId = req.empId;

    if (!discountCode || !cartList) {
      return next(
        new AppError('Discount code and cart list are required.', 400)
      );
    }

    req.body = { customerId, discountCode, discountType: 'Manual', cartList };
    next();
  } catch (error) {
    return next(new AppError('Error applying discount by code.', 500));
  }
});

// Calculate product amount discount
const calculateProductAmountDiscount = async (discount, cart) => {
  try {
    const { type, value, max_get_y_qty } = discount;
    const { inCartProducts } = await getXDiscountProducts(discount, cart);

    let discountAmount = 0;
    let message = '';

    if (inCartProducts.length === 0) {
      return { discountAmount, message: 'No discount products' };
    }

    for (const p of inCartProducts) {
      const total = calculateCartTotalValue([
        {
          ...p,
          azst_cart_quantity: Math.min(
            max_get_y_qty,
            parseFloat(p.azst_cart_quantity)
          ),
        },
      ]);

      let amount = 0;
      if (type === 'percentage') {
        amount = percentageCalculator(total, value);
      } else {
        amount = flatCalculator(total, value);
      }

      await updateProductDaiscountIncart(p.azst_cart_id, amount);
      discountAmount += amount;
    }

    return { discountAmount, message };
  } catch (error) {
    throw new AppError('Error calculating product amount discount.', 500);
  }
};

// Calculate Buy X Get Y discount
const calculateBuyXGetYDiscount = async (
  discount,
  cart,
  customerId,
  sessionId
) => {
  try {
    const { type, value, max_get_y_qty } = discount;
    const { inCartProducts } = await getXDiscountProducts(discount, cart);

    if (inCartProducts.length === 0) {
      return { discountAmount: 0, message: 'No discount products' };
    }

    const cProducts = await getYDiscountProducts(discount, cart);
    const YdiscountProducts = cProducts.inCartProducts;
    const toAddCart = cProducts.remainProducts;

    const newCartProducts = await addProductsToCart(
      toAddCart,
      max_get_y_qty,
      customerId,
      sessionId
    );

    const allYproducts = [...YdiscountProducts, ...newCartProducts];

    let discountAmount = 0;
    let message = '';

    for (const p of allYproducts) {
      const total = calculateCartTotalValue([
        {
          ...p,
          azst_cart_quantity: Math.min(
            max_get_y_qty,
            parseFloat(p.azst_cart_quantity)
          ),
        },
      ]);

      let amount = 0;
      if (type === 'percentage') {
        amount = percentageCalculator(total, value);
      } else {
        amount = flatCalculator(total, value);
      }

      await updateProductDaiscountIncart(p.azst_cart_id, amount);
      discountAmount += amount;
    }

    return { discountAmount, allYproducts, message };
  } catch (error) {
    throw new AppError('Error calculating Buy X Get Y discount.', 500);
  }
};

// Main discount handler
exports.myDiscounts = catchAsync(async (req, res, next) => {
  try {
    const {
      customerId,
      discountCode,
      discountType = 'Automatic',
      cartList,
      sessionId,
    } = req.body;

    if (!customerId || !cartList) {
      return next(new AppError('Customer ID and Cart List are required.', 400));
    }

    const today = moment().format('YYYY-MM-DD HH:mm:ss');
    const discountQuery = `
      SELECT
        dc.discount_id,
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
      FROM azst_discounts_tbl as ds
      LEFT JOIN azst_discount_conditions as dc ON ds.id = dc.discount_id
      LEFT JOIN azst_cus_dsc_mapping_tbl as cdm ON ds.id = cdm.azst_cdm_dsc_id AND cdm.azst_cdm_cus_id = ?
      WHERE method = ?
        AND status = 1
        AND (eligible_customers = 'all' OR JSON_CONTAINS(eligible_customers, JSON_ARRAY(?)))
        AND ? BETWEEN start_time AND end_time 
        ${discountCode ? 'AND code = ?' : ''}
      GROUP BY cdm.azst_cdm_dsc_id
      HAVING discount_used < ds.usage_count;
    `;

    const values = [customerId, discountType, customerId, today];
    if (discountCode) values.push(discountCode);

    await db("SET SESSION sql_mode = ''");
    const discounts = await db(discountQuery, values);

    if (discountType === 'Manual' && discounts.length === 0) {
      return next(new AppError('Invalid or expired discount code.', 400));
    }

    let totalDiscountAmount = 0;
    let discountMessage = '';
    const cart = typeof cartList === 'string' ? JSON.parse(cartList) : cartList;
    let yProducts = [];

    console.log(discounts);
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

      totalDiscountAmount += result.discountAmount;
      yProducts = result.allYproducts ? result.allYproducts : [];
      if (result.message) discountMessage = result.message; // Accumulate the message
    }

    const newCart = yProducts.length > 1 ? [...cart, ...yProducts] : cart;
    const cartTotal = calculateCartTotalValue(newCart);
    const discountAmount = Math.min(cartTotal, totalDiscountAmount).toFixed(2);

    res.status(200).json({
      cart_products: newCart,
      cart_total: cartTotal,
      discountCode,
      discountAmount,
      message: discountMessage,
    });
  } catch (error) {
    return next(new AppError('Error processing discounts.', 500));
  }
});
