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

module.exports = {
  getofferPercentage,
  getPricess,
  calculateCartTotalValue,
  getCartTaxTotal,
};
