const Joi = require('joi');
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
                    AND azst_customer_id = ? AND azst_session_id = ?
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
  try {
    const query =
      'UPDATE azst_cart_tbl SET azst_cart_quantity=? ,azst_customer_id = ? WHERE  azst_cart_id = ?';
    await db(query, values);
  } catch (error) {
    throw error;
  }
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

const cartProductSchema = Joi.object({
  productId: Joi.number().required(),
  variantId: Joi.number().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const cartSchema = Joi.object({
  cartProducts: Joi.array().items(cartProductSchema).required(),
  customerId: Joi.number().min(0).optional(),
  sessionId: Joi.string()
    .when('customerId', {
      is: 0,
      then: Joi.string().min(1).required(), // If customerId is 0, sessionId must be a non-empty string
      otherwise: Joi.string().allow(''), // Otherwise, sessionId can be empty or any string
    })
    .optional(),
}).or('customerId', 'sessionId'); // Ensure at least one of customerId or sessionId is provided and valid

exports.addProductToCart = catchAsync(async (req, res, next) => {
  const { cartProducts, customerId, sessionId } = req.body;

  const { error } = cartSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

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
      return next(new AppError(err.sqlMessage ? err.sqlMessage : '', 400));
    }
  }
  res.status(200).json({ message: 'Added to cart successfully' });
});

exports.updateLocalToUser = catchAsync(async (req, res, next) => {
  const { sessionId } = req.body;
  const userId = req.empId;

  const query = `UPDATE azst_cart_tbl 
                  SET azst_customer_id = ? 
                  WHERE azst_session_id = ?
                    AND (azst_customer_id = 0 OR azst_customer_id = '')
                    AND  azst_cart_status = 1`;

  await db(query, [userId, sessionId]);
  res.status(200).json({ message: 'success' });
});

// HERE handling the update quantity of product in cart by (+ , - ) button operator operations

const updateQuantitySchema = Joi.object({
  cartId: Joi.number().required(),
  quantity: Joi.number().required(),
  customerId: Joi.number().optional(),
});

exports.handleProductQuantityUpdate = catchAsync(async (req, res, next) => {
  try {
    const { error } = updateQuantitySchema.validate(req.body);
    if (error) return next(new AppError(error.message, 400));
    const { cartId, quantity, customerId } = req.body;

    if (parseInt(quantity) === 0) {
      const query =
        'Update azst_cart_tbl set azst_cart_status = 0 where azst_cart_id = ?';
      await db(query, [cartId]);
    }
    const values = [quantity, customerId, cartId];
    await updateProductQuantity(values);
    res.status(200).json({ message: 'quantity updated' });
  } catch (err) {
    return next(
      new AppError(
        err.sqlMessage ? err.sqlMessage : 'oops something went wrong',
        400
      )
    );
  }
});

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
