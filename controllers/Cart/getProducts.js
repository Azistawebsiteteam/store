const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

const getCartData = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cart_id,azst_variant_id ,azst_quantity ,azst_customer_id,
                    product_id ,variant_image,actual_price,offer_price ,offer_percentage
                  FROM  azst_cart
                   JOIN azst_sku_variant_info ON azst_cart.azst_variant_id = azst_sku_variant_info.id
                  WHERE  azst_customer_id = ? `;

  db.query(query, [req.empId], (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));

    const cart_products = result.map((product) => ({
      ...product,
      variant_image: `${req.protocol}://${req.get(
        'host'
      )}/product/variantimage/${product.variant_image}`,
    }));

    res
      .status(200)
      .json({ cart_products, message: 'Data Retrived Successfully' });
  });
});

module.exports = getCartData;
