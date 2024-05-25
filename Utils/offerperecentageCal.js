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

const getPricess = (variant) => {
  if (variant.main) {
    return {
      offer_price: variant.main.offer_price,
      comparePrice: variant.main.comparePrice,
    };
  } else {
    const variant = variant.sub[0];
    return {
      offer_price: variant.main.offer_price,
      comparePrice: variant.main.comparePrice,
    };
  }
};

module.exports = { getofferPercentage, getPricess };
