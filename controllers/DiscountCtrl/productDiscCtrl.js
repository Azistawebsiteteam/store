const db = require('../../Database/dbconfig'); // Adjust path as necessary
const runTransaction = require('../../Database/dbtransctions');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const {
  discountSchema,
  discountConditionSchema,
} = require('../../Models/disscount');

exports.createDiscount = catchAsync(async (req, res, next) => {
  const { discount, conditions } = req.body;
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
  } = discount;

  const { error } = discountSchema.validate(discount);
  if (error) return next(new AppError(error.message, 400));

  // Validate discount conditions
  const { error: conditionError } = discountConditionSchema.validate({
    ...conditions,
    discountId,
  });

  if (conditionError) throw new AppError(conditionError.message, 400);

  // Insert discount details
  const queryDiscount = `INSERT INTO azst_discounts_tbl (title, code, method, type, value, usage_count,
                            start_time, end_time, eligible_customers,created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?)`;

  const values = [
    title,
    code,
    method,
    type,
    value,
    usageCount,
    startTime,
    endTime,
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

  console.log(
    JSON.stringify([
      { productId: '80', variantId: 260 },
      { productId: 79, variantId: 20 },
    ])
  );

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
  const query = `SELECT * FROM  azst_discount_tbl WHERE azst_dsc_status = 1;`;
  const result = await db(query);
  res.status(200).json(result);
});

exports.discountDetails = catchAsync(async (req, res, next) => {
  const { discountId } = req.body;
  const query = `SELECT * FROM  azst_discount_tbl WHERE azst_dsc_id = ? AND azst_dsc_status = 1; `;
  const result = await db(query, [discountId]);

  res.status(200).json(result.length > 0 ? result[0] : {});
});

exports.UpdateDiscount = catchAsync(async (req, res, next) => {
  const {
    discountId, // Assuming id is passed in the request body to identify the record to update
    title,
    code,
    mode,
    value,
    applyMode,
    applyId,
    prcMode,
    prcValue,
    elgCustomers,
    maxApplyValue,
    usgCount,
    startTime,
    endTime,
  } = req.body;

  const disQuery = `UPDATE azst_discount_tbl
                  SET 
                    azst_dsc_title = ?,
                    azst_dsc_code = ?,
                    azst_dsc_mode = ?,
                    azst_dsc_value = ?,
                    azst_dsc_apply_mode = ?,
                    azst_dsc_apply_id = ?,
                    azst_dsc_prc_mode = ?,
                    azst_dsc_prc_value = ?,
                    azst_dsc_elg_cus = ?,
                    azst_dsc_apply_qty = ?,
                    azst_dsc_usage_cnt = ?,
                    azst_dsc_start_tm = ?,
                    azst_dsc_end_tm = ?,
                    azst_dsc_cr_by = ?
                  WHERE azst_dsc_id = ?`;

  const values = [
    title,
    code,
    mode,
    value,
    applyMode,
    applyId,
    prcMode,
    prcValue,
    elgCustomers,
    maxApplyValue,
    usgCount,
    startTime,
    endTime,
    req.empId,
    discountId, // Make sure the id is included at the end of the values array
  ];

  const response = await db(disQuery, values);

  if (response.affectedRows > 0)
    return res.status(200).json({
      message: 'Discount updated successfully',
    });

  next(new AppError('Oops! Something went wrong', 400));
});

exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const { discountId } = req.body;

  const query = `UPDATE azst_discount_tbl SET azst_dsc_status = 0 WHERE azst_dsc_id = ? `;
  const response = await db(query, [discountId]);

  if (response.affectedRows > 0)
    return res.status(200).json({
      message: 'Discount deleted successfully',
    });

  next(new AppError('Oops! Something went wrong', 400));
});

// azst_dsc_id,
//   azst_dsc_title,
//   azst_dsc_code,
//   azst_dsc_mode,
//   azst_dsc_value,
//   azst_dsc_apply_mode,
//   azst_dsc_apply_id,
//   azst_dsc_prc_value,
//   azst_dsc_elg_cus,
//   azst_dsc_apply_qty,
//   azst_dsc_usage_cnt,
//   azst_dsc_prc_mode,
// azst_dsc_start_tm,
// azst_dsc_end_tm,

//   azst_dsc_cr_by,
//   azst_dsc_up_by,
//   azst_dsc_cr_on,
//   azst_dsc_up_on,
//   azst_dsc_status,
