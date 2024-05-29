const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');

const getImageName = (images) => {
  const parsedImages = JSON.parse(images);
  if (parsedImages) {
    return parsedImages[1] ? parsedImages[1] : parsedImages[0];
  } else {
    return '';
  }
};

const getCartData = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cart_id,product_title,azst_variant_id,price ,azst_quantity ,azst_customer_id,image_src,product_url_title,
                  product_id ,variant_image,azst_products.compare_at_price as product_compare_at_price,azst_sku_variant_info.compare_at_price,offer_price ,offer_percentage,
                  option1, option2, option3
                  FROM  azst_cart
                  Left JOIN azst_sku_variant_info ON azst_cart.azst_variant_id = azst_sku_variant_info.id
                  left JOIN azst_products ON azst_cart.azst_product_id  = azst_products.id 
                  WHERE  azst_customer_id = ? `;

  const result = await db(query, [req.empId]);

  const cart_products = result.map((product) => ({
    ...product,
    variant_image: `${req.protocol}://${req.get(
      'host'
    )}/product/variantimage/${getImageName(product.variant_image)}`,
    image_src: `${req.protocol}://${req.get('host')}/product/images/${
      product.image_src
    }`,
  }));

  res
    .status(200)
    .json({ cart_products, message: 'Data Retrived Successfully' });
});

module.exports = getCartData;
