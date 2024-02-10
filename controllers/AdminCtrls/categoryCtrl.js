const moment = require('moment');
const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isCategoryExit = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;
  if (!categoryId) return next(new AppError('Category Id is Required', 400));
  const getCategory = `SELECT * FROM azst_category_tbl WHERE  azst_category_id = ${categoryId} AND azst_category_status = 1`;
  db.query(getCategory, (err, category) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    if (category.length === 0)
      return next(new AppError('No category found', 404));
    req.category = category[0];
    next();
  });
});

exports.getcategories = catchAsync(async (req, res, next) => {
  const categoryQuery = `SELECT azst_category_id,azst_category_name 
                       FROM azst_category_tbl WHERE azst_category_status = 1`;

  db.query(categoryQuery, (err, categories) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json(categories);
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  res.status(200).json(req.category);
});

exports.addcategory = catchAsync(async (req, res, next) => {
  const { categoryName } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const imnsertQuery =
    'INSERT INTO  azst_category_tbl (azst_category_name,azst_category_createdon,azst_updated_by) VALUES (?,?,?)';

  const values = [categoryName, today, req.empId];

  db.query(imnsertQuery, values, (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json({ azst_category_id: result.insertId });
  });
});

exports.updatecategory = catchAsync(async (req, res, next) => {
  const { categoryId, categoryName } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const updateQuery =
    'UPDATE azst_category_tbl SET azst_category_name=?, azst_updated_by=? where azst_category_id =? ';
  const values = [categoryName, req.empId, categoryId];

  db.query(updateQuery, values, (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json({ message: 'Updated category ' + categoryName });
  });
});

exports.deletecategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;
  const deletecategory =
    'UPDATE azst_category_tbl SET azst_category_status = 0, azst_updated_by=? where azst_category_id = ? ';
  const values = [req.empId, categoryId];

  db.query(deletecategory, values, (err, result) => {
    if (err) return next(new AppError(err.sqlMessage, 400));
    res.status(200).json({ message: 'category deleted Successfully ' });
  });
});
