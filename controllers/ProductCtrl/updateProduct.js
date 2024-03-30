const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');

const getProductImageLink = (req, product) => ({
  ...product,
  image_src: `${req.protocol}://${req.get('host')}/product/images/${
    product.image_src
  }`,
});


