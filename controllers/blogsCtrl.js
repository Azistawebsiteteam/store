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

exports.uploadblogImg = upload.fields([
  { name: 'blogImg', maxCount: 1 },
  { name: 'blogThumbnailImg', maxCount: 1 },
]);

const uploadBlogImage = async (files) => {
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const images = {};
  const promises = [];

  for (const fieldName in files) {
    const imageField = files[fieldName][0];

    // Check the file type
    if (!allowedMimeTypes.includes(imageField.mimetype)) {
      throw new AppError(
        'Invalid file type. Only PNG, JPEG, and JPG are allowed.',
        400
      );
    }

    const imageName = `${Date.now()}-${imageField.originalname.replace(
      / /g,
      '-'
    )}`;
    const folder = `Uploads/blogImages/`; //  folder path to stroe image

    // Process image and save it
    promises.push(
      sharp(imageField.buffer)
        .toFile(`${folder}${imageName}`)
        .then(() => {
          images[fieldName] = imageName;
        })
    );
  }

  await Promise.all(promises);
  return images;
};

// Middleware to validate and store banner images
exports.storeBlogImgs = catchAsync(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length < 2) {
    return next(new AppError('Blog images are required', 400));
  }

  const images = await uploadBlogImage(req.files);
  Object.keys(images).forEach((image) => {
    req.body[image] = images[image];
  });
  next();
});

// Middleware to validate and update banner images
exports.updateStoreBlogImgs = catchAsync(async (req, res, next) => {
  const { azst_blg_img, azst_blg_thumbnail_img } = req.blog;

  if (!req.files || Object.keys(req.files).length === 0) {
    // No files uploaded, use existing images
    req.body.blogImg = azst_blg_img;
    req.body.blogThumbnailImg = azst_blg_thumbnail_img;
    return next();
  }

  if (req.files && Object.keys(req.files).length === 1) {
    // One file uploaded, determine which one and handle it
    for (const fieldName in req.files) {
      const imagePath =
        fieldName === 'blogImg'
          ? `Uploads/blogImages//${azst_blg_img}`
          : `Uploads/blogImages//${azst_blg_thumbnail_img}`;

      fs.unlink(imagePath, (err) => {
        if (err) console.error('Failed to delete old image:', err);
      });

      const images = await uploadBlogImage(req.files);
      req.body[fieldName] = images[fieldName];

      // Ensure the other banner image is retained
      if (fieldName === 'blogImg') {
        req.body.blogThumbnailImg = azst_blg_thumbnail_img;
      } else {
        req.body.blogImg = azst_blg_img;
      }
    }
    return next();
  }

  // Both files uploaded
  for (const fieldName in req.files) {
    const imagePath =
      fieldName === 'blogImg'
        ? `Uploads/blogImages//${azst_blg_img}`
        : `Uploads/blogImages//${azst_blg_thumbnail_img}`;

    fs.unlink(imagePath, (err) => {
      if (err) console.error('Failed to delete old image:', err);
    });
  }

  const images = await uploadBlogImage(req.files);
  Object.keys(images).forEach((image) => {
    req.body[image] = images[image];
  });

  next();
});

const getBlogImgLink = (req, img) =>
  `${req.protocol}://${req.get('host')}/api/images/blog/${img}`;

exports.createBlog = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    content,
    product,
    type,
    blogImg,
    blogThumbnailImg,
  } = req.body;
  const createdBy = req.empId;

  const query = `INSERT INTO azst_blogs_tbl (
                        azst_blg_title,
                        azst_blg_description,
                        azst_blg_content,
                        azst_blg_product,
                        azst_blg_img,
                        azst_blg_thumbnail_img,
                        azst_blg_type,
                        azst_blg_created_by) 
                 VALUES (?,?,?,?,?,?,?,?)`;
  const values = [
    title,
    description,
    content,
    product,
    blogImg,
    blogThumbnailImg,
    type,
    createdBy,
  ];

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
    azst_blg_description: blog.azst_blg_description,
    azst_blg_content: blog.azst_blg_content,
    azst_blg_product: blog.azst_blg_product,
    azst_blg_type: blog.azst_blg_type,
    azst_blg_img: getBlogImgLink(req, blog.azst_blg_img),
    azst_blg_thumbnail_img: getBlogImgLink(req, blog.azst_blg_thumbnail_img),
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
    azst_blg_thumbnail_img: getBlogImgLink(
      req,
      req.blog.azst_blg_thumbnail_img
    ),
  };

  res.status(200).json(blog);
});

exports.updateBlog = catchAsync(async (req, res, next) => {
  const {
    id,
    title,
    description,
    content,
    product,
    type,
    blogImg,
    blogThumbnailImg,
  } = req.body;

  const fields = {
    azst_blg_title: title,
    azst_blg_description: description,
    azst_blg_content: content,
    azst_blg_product: product,
    azst_blg_img: blogImg,
    azst_blg_thumbnail_img: blogThumbnailImg,
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
