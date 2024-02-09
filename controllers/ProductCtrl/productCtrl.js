const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.getProducts = catchAsync(async (req, res, next) => {
  const productquery = '';
  db.query(productquery, (err, products) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
  });
});
