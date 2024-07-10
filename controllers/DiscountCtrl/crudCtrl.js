const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.createDisscount = catchAsync(async (req, res, next) => {
  const {
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

  const disQuery = `INSERT INTO azst_discount_tbl (
                    azst_dsc_title,
                    azst_dsc_code,
                    azst_dsc_mode,
                    azst_dsc_value,
                    azst_dsc_apply_mode,
                    azst_dsc_apply_id,
                    azst_dsc_prc_mode,
                    azst_dsc_prc_value,
                    azst_dsc_elg_cus,
                    azst_dsc_apply_qty,
                    azst_dsc_usage_cnt,
                    azst_dsc_start_tm,
                    azst_dsc_end_tm,
                    azst_dsc_cr_by
                  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

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
  ];

  const response = await db(disQuery, values);

  if (response.affectedRows > 0)
    return res.status(200).json({
      discountId: response.insertId,
      message: 'discount created successfully',
    });
  next(new AppError('opps Something went wrong', 400));
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
