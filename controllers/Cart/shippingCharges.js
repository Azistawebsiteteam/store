const db = require('../../Database/dbconfig');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.checkDulicateCharge = catchAsync(async (req, res, next) => {
  const { cartAmount, chargeAmount, chargeId } = req.body;

  // Check if there's already a free shipping charge
  let queryCheckFreeCharge = `
    SELECT 1 FROM azst_shipping_charges
    WHERE azst_charge_status = 1 AND (azst_cart_amount = ? OR azst_charge_amount = ?)
  `;
  let values = [cartAmount, chargeAmount];
  if (chargeId) {
    queryCheckFreeCharge = queryCheckFreeCharge + ' AND  azst_charge_id <> ?';
    values.push(chargeId);
  }

  const [existingFreeCharge] = await db(queryCheckFreeCharge, values);

  if (existingFreeCharge)
    return next(new AppError('this charges already exists', 400));
  next();
});

exports.addCharge = catchAsync(async (req, res, next) => {
  const { cartAmount, chargeAmount } = req.body;

  // Proceed to add the shipping charge
  const queryInsert = `
    INSERT INTO azst_shipping_charges 
    (azst_cart_amount, azst_charge_amount, azst_charge_created_by)
    VALUES (?, ?, ?)
  `;

  const values = [cartAmount, chargeAmount, req.empId];
  const result = await db(queryInsert, values);

  res.status(200).json({
    chargeId: result.insertId,
    message: 'Shipping charge added successfully',
  });
});

exports.updateCharge = catchAsync(async (req, res, next) => {
  const { cartAmount, chargeAmount, chargeId } = req.body;

  const query = `UPDATE azst_shipping_charges 
                 SET  azst_cart_amount = ?, azst_charge_amount = ?, azst_charge_update_by = ?
                 WHERE azst_charge_id = ? `;
  const values = [cartAmount, chargeAmount, req.empId, chargeId];
  await db(query, values);
  res.status(200).json({ message: 'shpping charge updated successfully' });
});

exports.deleteCharge = catchAsync(async (req, res, next) => {
  const { chargeId } = req.body;
  const query = `UPDATE azst_shipping_charges 
                  SET  azst_charge_status = ?,  azst_charge_update_by = ?
                  WHERE azst_charge_id = ?  `;

  const values = [0, req.empId, chargeId];
  await db(query, values);

  res.status(200).json({ message: 'shpping charge deleted successfully' });
});

exports.allCharges = catchAsync(async (req, res, next) => {
  const { cartAmount, chargeAmount } = req.body;
  const query = `SELECT *, DATE_FORMAT(azst_charge_created_on , '%d-%m-%Y') as created_on,
                    DATE_FORMAT(azst_charge_update_on, '%d-%m-%Y') as updated_on
                 FROM azst_shipping_charges
                 WHERE azst_charge_status = 1
                 ORDER BY azst_charge_created_on DESC`;
  const values = [cartAmount, chargeAmount, req.empId];
  const charges = await db(query, values);
  res.status(200).json(charges);
});

exports.freeCharges = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cart_amount,azst_charge_amount
                    FROM  azst_shipping_charges
                    WHERE azst_charge_status = 1 AND azst_charge_amount = 0 `;
  const [charge] = await db(query);
  if (charge) {
    res.status(200).json(charge);
  } else {
    res.status(200).json({});
  }
});

