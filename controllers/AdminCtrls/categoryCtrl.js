const moment = require('moment');
const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isCategoryExit = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;
  if (!categoryId) return next(new AppError('Category Id is Required', 400));
  const getCategory = `SELECT azst_category_id,azst_category_name 
                        FROM azst_category_tbl
                        WHERE  azst_category_id = ${categoryId} AND azst_category_status = 1`;
  const category = await db(getCategory);
  if (category.length === 0)
    return next(new AppError('No category found', 404));
  req.category = category[0];
  next();
});

exports.getcategories = catchAsync(async (req, res, next) => {
  const categoryQuery = `SELECT azst_category_id,azst_category_name 
                       FROM azst_category_tbl WHERE azst_category_status = 1`;
  const categories = await db(categoryQuery);
  res.status(200).json(categories);
});

exports.getSubcategories = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;

  const categoryQuery = `SELECT azst_sub_category_id,azst_sub_category_name 
                         FROM azst_sub_category_tbl
                         WHERE azst_sub_category_status = 1 AND azst_category_id = ? `;
  const categories = await db(categoryQuery, [categoryId]);
  res.status(200).json(categories);
});

exports.getAdminSubCategories = catchAsync(async (req, res, next) => {
  const categoryQuery = `SELECT azst_sub_category_id,azst_sub_category_name 
                         FROM azst_sub_category_tbl`;
  const categories = await db(categoryQuery);
  res.status(200).json(categories);
});

exports.getCategory = catchAsync(async (req, res, next) => {
  res.status(200).json(req.category);
});

exports.getSubCategory = catchAsync(async (req, res, next) => {
  const { subCategoryId } = req.body;
  const getCategory = `SELECT azst_sub_category_id,azst_sub_category_name,azst_category_id
                        FROM azst_sub_category_tbl
                        WHERE  azst_sub_category_id = ${subCategoryId} AND azst_sub_category_status = 1`;
  const category = await db(getCategory);
  if (category.length === 0)
    return next(new AppError('No category found', 404));
  res.status(200).json(category[0]);
});

exports.addcategory = catchAsync(async (req, res, next) => {
  const { categoryName } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const insertQuery =
    'INSERT INTO  azst_category_tbl (azst_category_name,azst_category_createdon,azst_updated_by) VALUES (?,?,?)';

  const values = [categoryName, today, req.empId];

  const result = await db(insertQuery, values);
  res.status(200).json({ azst_category_id: result.insertId });
});

// azst_sub_category_id,
//   azst_sub_category_name,
//   azst_category_id,
//   azst_sub_category_status,
//   category_createdon,
//   category_updatedon,
//   updated_by;

exports.addSubCategory = catchAsync(async (req, res, next) => {
  const { categoryName, categoryId } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const insertQuery =
    'INSERT INTO  azst_sub_category_tbl (azst_sub_category_name,azst_category_id,updated_by) VALUES (?,?,?)';

  const values = [categoryName, categoryId, req.empId];

  const result = await db(insertQuery, values);
  res.status(200).json({ azst_sub_category_id: result.insertId });
});

exports.updatecategory = catchAsync(async (req, res, next) => {
  const { categoryId, categoryName } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const updateQuery =
    'UPDATE azst_category_tbl SET azst_category_name=?, azst_updated_by=? where azst_category_id =? ';
  const values = [categoryName, req.empId, categoryId];

  await db(updateQuery, values);
  res.status(200).json({ message: 'Updated category ' + categoryName });
});

exports.updateSubCategory = catchAsync(async (req, res, next) => {
  const { subCategoryId, categoryName, categoryId } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));
  if (!categoryId) return next(new AppError('CategoryId is Required', 400));

  const updateQuery =
    'UPDATE azst_sub_category_tbl SET azst_sub_category_name=?,azst_category_id = ?, updated_by=? where azst_sub_category_id =? ';
  const values = [categoryName, categoryId, req.empId, subCategoryId];

  await db(updateQuery, values);
  res.status(200).json({ message: 'Updated subCategory ' + categoryName });
});

exports.deletecategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;
  const deletecategory =
    'UPDATE azst_category_tbl SET azst_category_status = 0, azst_updated_by=? where azst_category_id = ? ';
  const values = [req.empId, categoryId];

  await db(deletecategory, values);
  res.status(200).json({ message: 'category deleted Successfully ' });
});

exports.deleteSubCategory = catchAsync(async (req, res, next) => {
  const { subCategoryId } = req.body;
  const deletecategory =
    'UPDATE azst_sub_category_tbl SET azst_sub_category_status = 0, updated_by=? where azst_sub_category_id = ? ';
  const values = [req.empId, subCategoryId];

  await db(deletecategory, values);
  res.status(200).json({ message: 'category deleted Successfully ' });
});
