const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const db = require('../../dbconfig');

exports.getVendors = catchAsync(async (req, res, next) => {
  const vednorQuery =
    'select azst_vendor_id, azst_vendor_name from azst_vendor_details where azst_vendor_status= 1';

  db.query(vednorQuery, (err, results) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json(results);
  });
});
