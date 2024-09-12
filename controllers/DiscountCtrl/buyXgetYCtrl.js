const db = require('../../Database/dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.createDiscount = catchAsync(async (req, res, next) => {
  const {
    title,
    code,
    applyMode,
    applyId,
    mode,
    value,
    discountType,
    discountValue,
    discountApplyMode,
    discountApplyTo,
    prcValue,
    elgCustomers,
    usgCount,
    startTime,
    endTime,
  } = req.body;

  const query = `
    INSERT INTO azst_buy_x_get_y_discount_tbl (
      azst_x_y_dsc_title,
      azst_x_y_dsc_code,
      azst_x_y_dsc_applyto,
      azst_x_y_dsc_applid,
      azst_x_y_dsc_buy_mode,
      azst_x_y_dsc_min_add_qty,
      azst_x_y_dsc_type,
      azst_x_y_dsc_value,
      azst_x_y_dsc_apply_to,
      azst_x_y_dsc_apply_id,
      azst_x_y_dsc_min_prc_qty,
      azst_x_y_dsc_elg_cus,
      azst_x_y_dsc_max_use,
      azst_x_y_dsc_start_time,
      azst_x_y_dsc_end_time,
      azst_x_y_dsc_create_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;

  const values = [
    title,
    code,
    applyMode,
    applyId,
    mode,
    value,
    discountType,
    discountValue,
    discountApplyMode,
    discountApplyTo,
    prcValue,
    elgCustomers,
    usgCount,
    startTime,
    endTime,
    req.empId,
  ];

  const result = await db(query, values);
  if (result.affectedRows === 0) return next(new AppError('Invalid data', 400));
  res.status(201).json({
    discountId: result.insertId,
    message: 'Discount added successfully',
  });
});

const formattedDiscount = (dsc) => ({
  azst_x_y_dsc_id: dsc.azst_x_y_dsc_id,
  azst_x_y_dsc_title: dsc.azst_x_y_dsc_title,
  azst_x_y_dsc_code: dsc.azst_x_y_dsc_code,
  azst_x_y_dsc_applyto: dsc.azst_x_y_dsc_apply_to,
  azst_x_y_dsc_applid: dsc.azst_x_y_dsc_applid,
  azst_x_y_dsc_buy_mode: dsc.azst_x_y_dsc_buy_mode,
  azst_x_y_dsc_min_add_qty: dsc.azst_x_y_dsc_min_add_qty,
  azst_x_y_dsc_apply_to: dsc.azst_x_y_dsc_apply_to,
  azst_x_y_dsc_apply_id: dsc.azst_x_y_dsc_apply_id,
  azst_x_y_dsc_min_prc_qty: dsc.azst_x_y_dsc_min_prc_qty,
  azst_x_y_dsc_type: dsc.azst_x_y_dsc_type,
  azst_x_y_dsc_value: dsc.azst_x_y_dsc_value,
  azst_x_y_dsc_elg_cus: dsc.azst_x_y_dsc_elg_cus,
  azst_x_y_dsc_max_use: dsc.azst_x_y_dsc_applid_use,
});

exports.getDiscounts = catchAsync(async (req, res, next) => {
  const query = `SELECT * FROM azst_buy_x_get_y_discount_tbl
                 WHERE azst_x_y_dsc_status = 1
                 ORDER BY azst_x_y_dsc_create_on DESC `;
  const result = await db(query);
  const discounts = result.map((dsc) => formattedDiscount(dsc));
  res.status(200).json(discounts);
});

exports.isExist = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  if (!id) return next(new AppError('discount id is required', 400));

  const query = `SELECT * 
                  FROM azst_buy_x_get_y_discount_tbl
                  WHERE azst_x_y_dsc_id = ? AND azst_x_y_dsc_status = 1 `;

  const result = await db(query, [id]);
  if (result.length === 0) return next(new AppError('no discount Found', 404));

  req.discount = result[0];
  next();
});

exports.getDiscount = catchAsync(async (req, res, next) => {
  const discount = formattedDiscount(req.discount);
  const keyd = Object.keys(discount);

  res.status(200).json(discount);
});

exports.updateDiscount = catchAsync(async (req, res, next) => {
  const {
    id,
    title,
    code,
    applyMode,
    applyId,
    mode,
    value,
    discountType,
    discountValue,
    discountApplyMode,
    discountApplyTo,
    prcValue,
    elgCustomers,
    usgCount,
    startTime,
    endTime,
  } = req.body;

  const query = `
    UPDATE azst_buy_x_get_y_discount_tbl SET
      azst_x_y_dsc_title = ?,
      azst_x_y_dsc_code = ?,
      azst_x_y_dsc_applyto = ?,
      azst_x_y_dsc_applid = ?,
      azst_x_y_dsc_buy_mode = ?,
      azst_x_y_dsc_min_add_qty = ?,
      azst_x_y_dsc_type = ?,
      azst_x_y_dsc_value = ?,
      azst_x_y_dsc_apply_to = ? ,
      azst_x_y_dsc_apply_id = ?,
      azst_x_y_dsc_min_prc_qty = ?,
      azst_x_y_dsc_elg_cus = ?,
      azst_x_y_dsc_max_use =?,
      azst_x_y_dsc_start_time = ?,
      azst_x_y_dsc_end_time = ?,
      azst_x_y_dsc_update_by = ?
    WHERE azst_x_y_dsc_id = ? 
    `;

  const values = [
    title,
    code,
    applyMode,
    applyId,
    mode,
    value,
    discountType,
    discountValue,
    discountApplyMode,
    discountApplyTo,
    prcValue,
    elgCustomers,
    usgCount,
    startTime,
    endTime,
    req.empId,
    id,
  ];

  const result = await db(query, values);
  if (result.affectedRows === 0) return next(new AppError('Invalid data', 400));
  res.status(201).json({
    discountId: id,
    message: 'Discount updated successfully',
  });
});

exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  const query = `UPDATE azst_buy_x_get_y_discount_tbl
                 SET azst_x_y_dsc_status =  0
                 WHERE azst_x_y_dsc_id = ?`;
  const result = await db(query, [id]);
  if (result.affectedRows === 0) return next(new AppError('Invalid data', 400));
  res.status(200).json(result);
});

// azst_x_y_dsc_id,
//   azst_x_y_dsc_title,
//   azst_x_y_dsc_code, discount code
//   azst_x_y_dsc_applyto, products or collections
//   azst_x_y_dsc_applid,  product or collection id's
//   azst_x_y_dsc_buy_mode, quantity or amount
//   azst_x_y_dsc_buy_value, quantity or amount value
//   azst_x_y_dsc_min_qty,  need to add minimum quantity to cart
//   azst_x_y_dsc_type,  percentage , amount or free
//   azst_x_y_dsc_value, value of selected filed above
//   azst_x_y_dsc_apply_to, product or collection
//   azst_x_y_dsc_apply_id, product or collection id's
//   azst_x_y_dsc_max_use, one customer can you this time
//   azst_x_y_dsc_elg_cus, customer's id's to get discount
//   azst_x_y_dsc_start_time, discount start time
//   azst_x_y_dsc_end_time; discount end time

//   azst_x_y_dsc_create_on,
//   azst_x_y_dsc_create_by,
//   azst_x_y_dsc_update_on,
//   azst_x_y_dsc_update_by,
//   azst_x_y_dsc_status,

// [
//   'azst_x_y_dsc_id',
//   'azst_x_y_dsc_title',
//   'azst_x_y_dsc_code',
//   'azst_x_y_dsc_applyto',
//   'azst_x_y_dsc_applid',
//   'azst_x_y_dsc_buy_mode',
//   'azst_x_y_dsc_min_add_qty',
//   'azst_x_y_dsc_apply_to',
//   'azst_x_y_dsc_apply_id',
//   'azst_x_y_dsc_min_prc_qty',
//   'azst_x_y_dsc_type',
//   'azst_x_y_dsc_value',
//   'azst_x_y_dsc_elg_cus',
//   'azst_x_y_dsc_max_use',
// ];
