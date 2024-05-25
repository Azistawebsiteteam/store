const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');

const getCartData = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cart_id,azst_variant_id ,azst_quantity ,azst_customer_id,
                    product_id ,variant_image,compare_at_price,offer_price ,offer_percentage
                  FROM  azst_cart
                   JOIN azst_sku_variant_info ON azst_cart.azst_variant_id = azst_sku_variant_info.id
                  WHERE  azst_customer_id = ? `;

  const result = await db(query, [req.empId]);

  const cart_products = result.map((product) => ({
    ...product,
    variant_image: `${req.protocol}://${req.get('host')}/product/variantimage/${
      product.variant_image
    }`,
  }));

  res
    .status(200)
    .json({ cart_products, message: 'Data Retrived Successfully' });
});

module.exports = getCartData;
