const db = require('../../Database/dbconfig'); // Adjust path as necessary

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const {
  discountSchema,
  discountConditionSchema,
} = require('../../Models/disscount');

exports.createDiscount = catchAsync(async (req, res, next) => {
  const { discount, conditions } = req.body;
  console.log({ discount, conditions });
  let discountId = null;

  const {
    title,
    code,
    method,
    type,
    value,
    customers,
    usageCount,
    startTime,
    endTime,
    productDscType = '',
  } = discount;

  const { error } = discountSchema.validate(discount);

  if (error) return next(new AppError(error.message, 400));

  // Validate discount conditions
  const { error: conditionError } = discountConditionSchema.validate({
    ...conditions,
    discountId,
  });

  console.log(conditionError);

  if (conditionError) throw new AppError(conditionError.message, 400);

  // Insert discount details
  const queryDiscount = `INSERT INTO azst_discounts_tbl (title, code, method, type, value, usage_count,
                            start_time, end_time, product_dsc_type, eligible_customers,created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

  const values = [
    title,
    code,
    method,
    type,
    value,
    usageCount,
    startTime,
    endTime,
    productDscType,
    customers,
    req.empId,
  ];

  const discountResults = await db(queryDiscount, values);

  if (discountResults.affectedRows === 0)
    return next(
      new AppError('Discount not created, something went wrong', 400)
    );

  discountId = discountResults.insertId;

  const {
    scope,
    minCartValue,
    buyProductType,
    buyProductId,
    minBuyQty,
    getProductType,
    getYproductId,
    maxGetYQty,
  } = conditions;

  // Insert discount conditions
  const queryCondition = `
        INSERT INTO azst_discount_conditions (discount_id, scope, min_cart_value, x_product_type, buy_x_product_id,
        min_buy_x_qty, y_product_type ,get_y_product_id, max_get_y_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const cvalues = [
    discountId,
    scope,
    minCartValue,
    buyProductType,
    JSON.stringify(buyProductId),
    minBuyQty,
    getProductType,
    JSON.stringify(getYproductId),
    maxGetYQty,
  ];

  const conditionResults = await db(queryCondition, cvalues);

  if (conditionResults.affectedRows === 0)
    return next(
      new AppError(
        'Something went wrong while creating discount conditions',
        400
      )
    );

  res.status(200).json({ message: 'Discount created successfully' });
});

exports.getDiscounts = catchAsync(async (req, res, next) => {
  const query = `SELECT * , ds.id as dsc_id FROM  azst_discounts_tbl ds 
                  LEFT JOIN azst_discount_conditions dc  ON  ds.id = dc.discount_id
                  WHERE  status = 1;`;

  const result = await db(query);
  res.status(200).json(result);
});

exports.discountDetails = catchAsync(async (req, res, next) => {
  const { discountId } = req.body;

  const query = `SELECT * , ds.id as dsc_id FROM  azst_discounts_tbl ds  
                  LEFT JOIN azst_discount_conditions dc  ON  ds.id = dc.discount_id
                  WHERE ds.id = ? AND status = 1; `;

  const result = await db(query, [discountId]);

  res.status(200).json(result.length > 0 ? result[0] : {});
});

exports.UpdateDiscount = catchAsync(async (req, res, next) => {
  const { discountId, discount, conditions } = req.body;

  const {
    title,
    code,
    method,
    type,
    value,
    customers,
    usageCount,
    productDscType = '',
    startTime,
    endTime,
  } = discount;

  // Validate discount data
  const { error } = discountSchema.validate(discount);
  if (error) return next(new AppError(error.message, 400));

  // Validate discount conditions
  const { error: conditionError } = discountConditionSchema.validate({
    ...conditions,
    discountId,
  });
  if (conditionError) return next(new AppError(conditionError.message, 400));

  // Update discount details
  const queryDiscount = `
    UPDATE azst_discounts_tbl 
    SET title = ?, code = ?, method = ?, type = ?, value = ?, usage_count = ?,
        start_time = ?, end_time = ?, product_dsc_type, eligible_customers = ?, updated_by = ?
    WHERE id = ?`;

  const discountValues = [
    title,
    code,
    method,
    type,
    value,
    usageCount,
    startTime,
    endTime,
    customers,
    productDscType,
    req.empId, // Assuming req.empId is the employee updating the record
    discountId,
  ];

  const discountResults = await db(queryDiscount, discountValues);

  if (discountResults.affectedRows === 0)
    return next(
      new AppError('Discount not updated, something went wrong', 400)
    );

  // Extract and validate conditions
  const {
    scope,
    minCartValue,
    buyProductType,
    buyProductId,
    minBuyQty,
    getProductType,
    getYproductId,
    maxGetYQty,
  } = conditions;

  // Update discount conditions
  const queryCondition = `
    UPDATE azst_discount_conditions 
    SET scope = ?, min_cart_value = ?, x_product_type = ?, buy_x_product_id = ?, 
        min_buy_x_qty = ?, y_product_type = ?, get_y_product_id = ?, max_get_y_qty = ?
    WHERE discount_id = ?`;

  const conditionValues = [
    scope,
    minCartValue,
    buyProductType,
    JSON.stringify(buyProductId), // Convert arrays/objects to JSON strings
    minBuyQty,
    getProductType,
    JSON.stringify(getYproductId), // Convert arrays/objects to JSON strings
    maxGetYQty,
    discountId,
  ];

  const conditionResults = await db(queryCondition, conditionValues);

  if (conditionResults.affectedRows === 0)
    return next(
      new AppError('Discount conditions not updated, something went wrong', 400)
    );

  // Respond with success message
  res.status(200).json({ message: 'Discount updated successfully' });
});

exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const { discountId } = req.body;

  const query = `UPDATE azst_discounts_tbl SET status = 0 WHERE  id = ? `;
  const response = await db(query, [discountId]);

  if (response.affectedRows > 0)
    return res.status(200).json({
      message: 'Discount deleted successfully',
    });

  next(new AppError('Oops! Something went wrong', 400));
});
