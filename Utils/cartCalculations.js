const db = require('../Database/dbconfig');

const getofferPercentage = (comparePrice, offer_price) => {
  let offerPercentage = 0;
  const parsedComparePrice = parseFloat(comparePrice);
  const parsedOfferPrice = parseFloat(offer_price);

  if (parsedComparePrice >= parsedOfferPrice && parsedComparePrice > 0) {
    offerPercentage = Math.round(
      ((parsedComparePrice - parsedOfferPrice) / parsedComparePrice) * 100
    );
  }

  return offerPercentage;
};

// Function to get min and max prices from variants
const getPricess = (variants, priceKey) => {
  const prices = [];

  // Loop through each variant to extract prices
  variants.forEach((variant) => {
    if (variant.sub && variant.sub.length > 0) {
      // Loop through sub-variants and push prices
      variant.sub.forEach((sv) => {
        prices.push(parseInt(sv[priceKey]));
      });
    } else if (variant.main) {
      // Push the price from the main variant
      prices.push(parseInt(variant.main[priceKey]));
    } else {
      prices.push(parseInt(variant[priceKey]));
    }
  });

  // Get minimum and maximum prices from the prices array
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  // Return formatted price range
  if (lowPrice !== highPrice) {
    return `Rs. ${lowPrice} - Rs. ${highPrice}`;
  } else {
    return `Rs. ${lowPrice}`;
  }
};

const calculateCartTotalValue = (cartList) => {
  // Validate that cartList is not empty or null
  if (!Array.isArray(cartList) || cartList.length === 0) return 0;

  const cartTotal = cartList.reduce((total, item) => {
    const itemPrice =
      item.is_varaints_aval === 1
        ? parseFloat(item.offer_price)
        : parseFloat(item.price);
    const itemQuantity = parseInt(item.azst_cart_quantity);
    return total + itemPrice * itemQuantity;
  }, 0);

  return cartTotal;
};

const getCartTaxTotal = (cartProducts) => {
  const taxAmount = cartProducts.reduce((acc, p) => {
    const itemPrice =
      p.is_varaints_aval === 1
        ? parseFloat(p.offer_price)
        : parseFloat(p.price);

    const productPrice = parseInt(p.azst_cart_quantity) * itemPrice;
    const taxPercentage = 10;
    const taxAmount = (productPrice / 100) * taxPercentage;
    return (acc += taxAmount);
  }, 0);
  return taxAmount;
};

// const calculateShippingCharge = async (amount) => {
//   // Query to fetch shipping charges data from the database
//   const query = `SELECT azst_cart_amount, azst_charge_amount FROM azst_shipping_charges WHERE azst_charge_status = 1`;
//   const result = await db(query); // Assume db(query) is a function that executes the query and returns a result

//   const deafaultChargeQuery = `SELECT MAX(azst_charge_amount)as deafault_charge FROM azst_shipping_charges ;`;
//   const [charge] = await db(deafaultChargeQuery);

//   let shippingCharges = charge.deafault_charge; // Default shipping charge

//   // Sort the results in descending order of cart amount
//   result.sort((a, b) => b.azst_cart_amount - a.azst_cart_amount);
//   const freeShipAmount = result.find(
//     (ship) => parseFloat(ship.azst_charge_amount) === 0.0
//   )?.azst_cart_amount;
//   const freeShipMsg = freeShipAmount
//     ? `Free shipping for orders over Rs. ${freeShipAmount}!`
//     : '';
//   // Find the first match where amount >= azst_cart_amount
//   for (const price of result) {
//     if (amount >= price.azst_cart_amount) {
//       shippingCharges = price.azst_charge_amount;
//       break;
//     }
//   }

//   return { shippingCharges: parseFloat(shippingCharges), freeShipMsg };
// };

const calculateShippingCharge = async (amount) => {
  // Fetch shipping charges data and default charge from the database
  const query = `
    SELECT azst_cart_amount, azst_charge_amount 
    FROM azst_shipping_charges 
    WHERE azst_charge_status = 1`;
  const result = await db(query);

  const { deafault_charge: defaultCharge } = (
    await db(
      `SELECT MAX(azst_charge_amount) AS deafault_charge FROM azst_shipping_charges`
    )
  )[0];

  // Determine free shipping threshold and message
  const freeShipAmount = result.find(
    (ship) => parseFloat(ship.azst_charge_amount) === 0
  )?.azst_cart_amount;
  const freeShipMsg = freeShipAmount
    ? `Free shipping for orders over Rs. ${freeShipAmount}!`
    : '';

  // Find applicable shipping charge
  const shippingCharges =
    result
      .sort((a, b) => b.azst_cart_amount - a.azst_cart_amount)
      .find((price) => amount >= price.azst_cart_amount)?.azst_charge_amount ||
    defaultCharge;

  return { shippingCharges: parseFloat(shippingCharges), freeShipMsg };
};

module.exports = {
  getofferPercentage,
  getPricess,
  calculateCartTotalValue,
  getCartTaxTotal,
  calculateShippingCharge,
};
