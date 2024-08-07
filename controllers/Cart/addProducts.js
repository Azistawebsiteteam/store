const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

const getProductFromCart = async (
  customerId,
  sessionId,
  variantId,
  productId
) => {
  const query = `SELECT azst_cart_id ,azst_cart_quantity 
                  FROM azst_cart_tbl
                  WHERE azst_cart_variant_id=?
                    AND azst_cart_product_id=?
                    AND (azst_customer_id = ? OR azst_session_id = ?)
                    AND azst_cart_status=1`;

  const result = await db(query, [
    variantId ?? 0,
    productId,
    customerId,
    sessionId,
  ]);
  if (result.length) {
    const { azst_cart_id, azst_cart_quantity } = result[0];
    return {
      isExist: result.length > 0,
      quantity: azst_cart_quantity,
      cartId: azst_cart_id,
    };
  }
  return {
    isExist: false,
    quantity: 0,
    cartId: 0,
  };
};

const updateProductQuantity = async (values) => {
  const query =
    'UPDATE azst_cart_tbl SET azst_cart_quantity=? ,azst_customer_id = ? WHERE  azst_cart_id = ?';
  await db(query, values);
};

const addProductToCart = async (values) => {
  const query = `INSERT INTO azst_cart_tbl (   azst_cart_product_id,
                      azst_cart_variant_id,
                      azst_cart_quantity,
                      azst_customer_id,
                      azst_session_id
                    ) VALUES (?, ?, ?, ?, ?)`;

  await db(query, values);
};

const addProductToCartHandler = catchAsync(async (req, res, next) => {
  const { cartProducts, customerId, sessionId } = req.body;

  for (const product of cartProducts) {
    try {
      const { isExist, quantity, cartId } = await getProductFromCart(
        customerId,
        sessionId,
        product.variantId,
        product.productId
      );

      if (isExist) {
        const updateQty = quantity + product.quantity;
        const values = [updateQty, customerId, cartId];
        await updateProductQuantity(values);
      } else {
        const values = [
          product.productId,
          product.variantId,
          product.quantity,
          customerId,
          sessionId,
        ];

        await addProductToCart(values);
      }
    } catch (err) {
      console.log(err);
      return next(new AppError(err.sqlMessage ? err.sqlMessage : '', 400));
    }
  }
  res.azst_cart_status(200).json({ message: 'Added to cart successfully' });
});

module.exports = addProductToCartHandler;

//   azst_cart_id,
//   azst_cart_product_id,
//   azst_cart_variant_id,
//   azst_cart_quantity,
//   azst_customer_id,
//   azst_session_id,
//   azst_cart_status,
//   azst_cart_created_on,
//   azst_cart_updated_on,
//   azst_cart_collection_id;
