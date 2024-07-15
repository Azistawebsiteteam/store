const moment = require('moment');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('file is Not an Image! please upload only image', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.single('categoryImg');

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    req.body.categoryImg = '';
    next(new AppError('Upload category image is required', 400));
  }
  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/categoryImages/${imageName}`);
  req.body.categoryImg = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_category_img } = req.category;
  if (!req.file) {
    req.body.categoryImg = azst_category_img;
    return next();
  }
  const imagePath = `Uploads/categoryImages/${azst_category_img}`;

  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/categoryImages/${imageName}`);
  req.body.categoryImg = imageName;
  next();
});

exports.isCategoryExit = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;
  if (!categoryId) return next(new AppError('Category Id is Required', 400));
  const getCategory = `SELECT azst_category_id,azst_category_name,azst_category_img,azst_category_description
                        FROM azst_category_tbl
                        WHERE  azst_category_id = ${categoryId} AND azst_category_status = 1`;
  const category = await db(getCategory);
  if (category.length === 0)
    return next(new AppError('No category found', 404));
  req.category = category[0];
  next();
});

const categoryImgLink = (req, img) =>
  `${req.protocol}://${req.get('host')}/api/images/category/${img}`;

exports.getcategories = catchAsync(async (req, res, next) => {
  const categoryQuery = `SELECT azst_category_id,azst_category_name, azst_category_img
                       FROM azst_category_tbl WHERE azst_category_status = 1`;

  const result = await db(categoryQuery);
  const categories = result.map((category) => ({
    ...category,
    azst_category_img: categoryImgLink(req, category.azst_category_img),
  }));
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
  const category = req.category;
  const categories = {
    ...category,
    azst_category_img: categoryImgLink(req, category.azst_category_img),
  };
  res.status(200).json(categories);
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
  const { categoryName, categoryImg, description } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const insertQuery =
    'INSERT INTO  azst_category_tbl (azst_category_name,azst_category_img,azst_category_description,azst_updated_by) VALUES (?,?,?,?)';

  const values = [categoryName, categoryImg, description, req.empId];

  const result = await db(insertQuery, values);
  res.status(200).json({ azst_category_id: result.insertId });
});

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
  const { categoryId, categoryName, categoryImg, description } = req.body;

  if (!categoryName)
    return next(new AppError('Category Name is Required', 400));

  const updateQuery = `UPDATE azst_category_tbl 
    SET azst_category_name =?, azst_category_img =? ,azst_category_description =?, azst_updated_by =?
    where azst_category_id =? `;
  const values = [
    categoryName,
    categoryImg,
    description,
    req.empId,
    categoryId,
  ];

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
