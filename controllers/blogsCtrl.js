const db = require('../dbconfig');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

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

exports.uploadImage = upload.single('blogImg');

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    next(new AppError('Upload blog image is required', 400));
  }
  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer)
    .resize(500, 700)
    .toFile(`Uploads/blogImages/${imageName}`);
  req.body.blogImg = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_blg_img } = req.blog;
  if (!req.file) {
    req.body.blogImg = azst_blg_img;
    return next();
  }
  const imagePath = `Uploads/blogImages/${azst_blg_img}`;

  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer)
    .resize(500, 700)
    .toFile(`Uploads/CollectionImages/${imageName}`);
  req.body.blogImg = imageName;
  next();
});

const getBlogImgLink = (req, img) =>
  `${req.protocol}://${req.get('host')}/api/images/blog/${img}`;

exports.createBlog = catchAsync(async (req, res, next) => {
  const { title, content, product, type, blogImg } = req.body;
  const createdBy = req.empId;

  const query = `INSERT INTO azst_blogs_tbl (
                        azst_blg_title,
                        azst_blg_content,
                        azst_blg_product,
                        azst_blg_img,
                        azst_blg_type,
                        azst_blg_created_by) 
                 VALUES (?,?,?,?,?,?)`;
  const values = [title, content, product, blogImg, type, createdBy];

  await db(query, values);
  res.status(201).json({
    status: 'success',
    message: 'Blog created successfully',
  });
});

exports.isBlogExist = catchAsync(async (req, res, next) => {
  let id = req.params.id || req.body.id;

  if (!id) return next(new AppError('Blog Id Required', 400));
  const query =
    'SELECT * FROM azst_blogs_tbl WHERE azst_blg_status = 1 AND azst_blg_id = ?  ';
  const blog = await db(query, [id]);

  if (!blog.length) {
    return next(new AppError('Blog not found', 404));
  }
  req.blog = blog[0];
  next();
});

exports.getAllBlogs = catchAsync(async (req, res, next) => {
  const query = `SELECT *, DATE_FORMAT(azst_blg_created_on, '%d-%m-%Y') as azst_blg_created 
               FROM azst_blogs_tbl
               WHERE azst_blg_status = 1
               ORDER BY azst_blg_created DESC`;

  const blogs = await db(query);

  const formattedBlogs = blogs.map((blog) => ({
    azst_blg_id: blog.azst_blg_id,
    azst_blg_title: blog.azst_blg_title,
    azst_blg_content: blog.azst_blg_content,
    azst_blg_product: blog.azst_blg_product,
    azst_blg_type: blog.azst_blg_type,
    azst_blg_img: getBlogImgLink(req, blog.azst_blg_img),
    azst_blg_created: blog.azst_blg_created,
  }));

  // if customer requested data unique blog types is reauired
  if (req.path === '/customer') {
    const blogTypes = Array.from(
      new Set(blogs.map((blog) => blog.azst_blg_type))
    );
    return res.status(200).json({ blogTypes, blogs: formattedBlogs });
  }
  res.status(200).json(formattedBlogs);
});

exports.getBlogById = catchAsync(async (req, res, next) => {
  const blog = {
    ...req.blog,
    azst_blg_img: getBlogImgLink(req, req.blog.azst_blg_img),
  };

  res.status(200).json(blog);
});

exports.updateBlog = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  const { title, content, product, type, blogImg } = req.body;

  const fields = {
    azst_blg_title: title,
    azst_blg_content: content,
    azst_blg_product: product,
    azst_blg_img: blogImg,
    azst_blg_type: type,
    azst_blg_updated_by: req.empId,
    azst_blg_updated_on: new Date(),
  };

  const updateFields = Object.keys(fields).filter(
    (field) => fields[field] !== undefined
  );
  if (updateFields.length === 0) {
    return next(new AppError('No fields to update', 400));
  }

  const updateValues = updateFields.map((field) => fields[field]);
  const setClause = updateFields.map((field) => `${field} = ?`).join(', ');

  const query = `UPDATE azst_blogs_tbl SET ${setClause} WHERE azst_blg_id = ?`;
  updateValues.push(id);

  await db(query, updateValues);

  res.status(200).json({
    status: 'success',
    message: 'Blog updated successfully',
  });
});

exports.deleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const query =
    'update  azst_blogs_tbl SET azst_blg_status = 0   WHERE azst_blg_id = ?';
  await db(query, [id]);

  res.status(200).json({
    message: 'Blog deleted successfully',
  });
});
