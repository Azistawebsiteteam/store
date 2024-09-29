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

module.exports = { getofferPercentage, getPricess };
