const moment = require('moment');
const util = require('util');
const Joi = require('joi');
const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const queryAsync = util.promisify(db.query).bind(db);

const vendorSchema = Joi.object({
  vendorName: Joi.string().min(3).required(),
});

exports.isVendeorExist = catchAsync(async (req, res, next) => {
  const { vendorId } = req.body;
  if (!vendorId) return next(new AppError('vendorId is required', 400));
  const query = `SELECT azst_vendor_id, azst_vendor_name  
                  FROM azst_vendor_details
                  WHERE azst_vendor_id = ? AND azst_vendor_status= 1 `;
  const result = await queryAsync(query, [vendorId]);

  if (result.length <= 0) return next(new AppError('not found', 404));
  req.vendor = result[0];
  next();
});

exports.getVendors = catchAsync(async (req, res, next) => {
  const vednorQuery =
    'select azst_vendor_id, azst_vendor_name FROM azst_vendor_details WHERE azst_vendor_status= 1';
  db.query(vednorQuery, (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json(results);
  });
});

exports.getVendor = catchAsync(async (req, res, next) => {
  res.status(200).json({ venodr_details: req.vendor });
});

exports.addVendor = catchAsync(async (req, res, next) => {
  const { vendorName } = req.body;
  const { error } = vendorSchema.validate({ vendorName });
  if (error) return next(new AppError(error.message, 400));
  const query = `INSERT INTO azst_vendor_details (azst_vendor_name ,azst_vendor_createdon) VALUES(?,?)`;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [vendorName, today];
  const result = await queryAsync(query, values);

  res.status(200).json({
    azst_vendor_id: result.insertId,
    message: 'Vendor added Successfully',
  });
});

exports.updateVendor = catchAsync(async (req, res, next) => {
  const { vendorId, vendorName } = req.body;
  const { error } = vendorSchema.validate({ vendorName });
  if (error) return next(new AppError(error.message, 400));
  const query = `UPDATE azst_vendor_details SET azst_vendor_name = ? WHERE azst_vendor_id=?`;
  await queryAsync(query, [vendorName, vendorId]);
  res.status(200).send({ message: 'Details updated successfully' });
});

exports.removeVendor = catchAsync(async (req, res, next) => {
  const { vendorId } = req.body;
  const query = `UPDATE azst_vendor_details SET azst_vendor_status = 0 WHERE azst_vendor_id=?`;
  await queryAsync(query, [vendorId]);
  res.status(200).send({ message: 'Deleted successfully' });
});
