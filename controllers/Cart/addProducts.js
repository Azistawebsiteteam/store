const Joi = require('joi');
const db = require('../../Database/dbconfig');
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

// Disable a cart entry by setting `azst_cart_status` to 0
const disableUnwantedQuantity = async (cartId) => {
  const query =
    'UPDATE azst_cart_tbl SET azst_cart_status = 0 WHERE azst_cart_id = ?';
  await db(query, [cartId]);
};

// Delete a duplicate cart entry based on cart ID
const deleteDuplicateCartEntry = async (cartId) => {
  const query = 'DELETE FROM azst_cart_tbl WHERE azst_cart_id = ?';
  await db(query, [cartId]);
};

// Update the quantity of a product in the cart and manage duplicates
const updateProductQuantity = async (quantity, customerId, cartId) => {
  try {
    // Update quantity and customer ID in the specified cart entry
    const updateQuery = `
      UPDATE azst_cart_tbl 
      SET azst_cart_quantity = ?, azst_customer_id = ? 
      WHERE azst_cart_id = ?
    `;
    const result = await db(updateQuery, [quantity, customerId, cartId]);
    if (result.affectedRows > 0) {
      // Retrieve product and variant information for the updated cart entry
      const cartInfoQuery = `
        SELECT azst_cart_product_id, azst_cart_variant_id, azst_customer_id,azst_session_id 
        FROM azst_cart_tbl 
        WHERE azst_cart_id = ?
      `;
      const [cartData] = await db(cartInfoQuery, [cartId]);

      const {
        azst_cart_product_id,
        azst_cart_variant_id,
        azst_customer_id,
        azst_session_id,
      } = cartData;

      let varifyId = azst_customer_id;
      let subQ = '';
      if (customerId !== 0) {
        varifyId = azst_customer_id;
        subQ = `AND azst_customer_id = ? `;
      } else {
        varifyId = azst_session_id;
        subQ = `AND azst_session_id = ?`;
      }
      // Find other cart entries for the same product-variant-customer combination
      const duplicateCartIdsQuery = `
        SELECT azst_cart_id 
        FROM azst_cart_tbl 
        WHERE azst_cart_product_id = ? 
          AND azst_cart_variant_id = ? 
           ${subQ}
          AND azst_cart_id != ?
      `;

      const duplicateCartEntries = await db(duplicateCartIdsQuery, [
        azst_cart_product_id,
        azst_cart_variant_id,
        varifyId,
        cartId,
      ]);

      // Disable or delete duplicate cart entries
      for (let { azst_cart_id } of duplicateCartEntries) {
        await deleteDuplicateCartEntry(azst_cart_id);
      }
    }
  } catch (error) {
    throw error;
  }
};

// Controller function to handle product quantity updates in the cart
exports.handleProductQuantityUpdate = catchAsync(async (req, res, next) => {
  try {
    const { error } = updateQuantitySchema.validate(req.body);
    if (error) return next(new AppError(error.message, 400));

    const { cartId, quantity, customerId } = req.body;

    // Disable unwanted quantities if quantity is zero
    if (parseInt(quantity) === 0) {
      await disableUnwantedQuantity(cartId);
    } else {
      // Update product quantity if not zero
      await updateProductQuantity(quantity, customerId, cartId);
    }

    req.body = { customerId };
    next();
  } catch (err) {
    return next(
      new AppError(err.sqlMessage || 'Oops, something went wrong', 400)
    );
  }
});

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
        await updateProductQuantity(values, cartId);
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
