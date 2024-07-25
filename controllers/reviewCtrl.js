const db = require('../dbconfig');
const multer = require('multer');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const moment = require('moment/moment');

exports.isReviewExist = catchAsync(async (req, res, next) => {
  const { reviewId } = req.body;
  if (!reviewId) return next(new AppError('Review Id Required', 400));
  const { empId } = req;

  const query =
    'SELECT review_id FROM product_review_rating_tbl WHERE  customer_id = ? AND review_id =?';
  const values = [empId, reviewId];

  const result = await db(query, values);
  if (!result || result.length === 0)
    return next(new AppError('No Review found', 404));
  req.reviewDetails = result[0];
  next();
});

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

exports.uploadImage = upload.fields([{ name: 'reviewImages', maxCount: 5 }]);

exports.storeImage = catchAsync(async (req, res, next) => {
  if (Object.keys(req.files).length > 0) {
    let reviewImages = [];
    if (req.body.reviewImages) {
      reviewImages = req.body.reviewImages;
      if (!Array.isArray(reviewImages)) {
        // Ensure reviewImages is an array
        next(new AppError('reviewImages is not an array', 400));
      }
    }

    // Initialize reviewImages as an array if it's falsy
    req.body.reviewImages = reviewImages;

    await Promise.all(
      req.files.reviewImages.map(async (file, i) => {
        const imageName = `${Date.now()}-${file.originalname.replace(
          / /g,
          '-'
        )}`;

        await sharp(file.buffer)
          .resize(500, 500)
          .toFile(`Uploads/reviewImages/${imageName}`);
        req.body.reviewImages.push(imageName);
      })
    );
    next();
  } else {
    req.body.reviewImages = req.body.reviewImages ?? [];
    next();
  }
});

exports.createReview = catchAsync(async (req, res, next) => {
  const { productId, reviewTitle, reviewContent, reviewPoints, reviewImages } =
    req.body;
  const { empId } = req;

  // Query to check if the review already exists
  const checkQuery =
    'SELECT * FROM product_review_rating_tbl WHERE customer_id = ? AND product_id = ?';
  const checkValues = [empId, productId];

  const existingReviews = await db(checkQuery, checkValues);

  if (existingReviews.length > 0) {
    // If a review already exists, send a response indicating so
    return res
      .status(400)
      .json({ message: 'You have already created a review for this product' });
  }

  // Query to insert the new review
  const insertQuery =
    'INSERT INTO product_review_rating_tbl (customer_id, product_id,review_title, review_content, review_points,review_images) VALUES (?,?,?,?,?,?)';
  const insertValues = [
    empId,
    productId,
    reviewTitle,
    reviewContent,
    reviewPoints,
    JSON.stringify(reviewImages),
  ];

  const result = await db(insertQuery, insertValues);

  if (result.affectedRows === 1) {
    return res.status(201).json({ message: 'Successfully Added Review' });
  }

  next(new AppError('Something went wrong', 400));
});

exports.updateReview = catchAsync(async (req, res, next) => {
  const { reviewId, reviewTitle, reviewContent, reviewPoints, reviewImages } =
    req.body;

  const updatedTime = moment().format('YYYY-MM-DD HH:mm:ss');

  const values = [
    reviewTitle,
    reviewContent,
    reviewPoints,
    updatedTime,
    1,
    reviewId,
  ];

  let imagesquery = '';
  if (reviewImages.length > 0) {
    imagesquery = 'review_images = ?,';
    const updatedImages = reviewImages.map((img) =>
      img.substring(img.lastIndexOf('/') + 1)
    );
    values.unshift(JSON.stringify(updatedImages));
  }

  const updatedReview = `UPDATE product_review_rating_tbl SET ${imagesquery} review_title=?, review_content = ?, review_points=?,review_updated_on = ?,is_modified =? WHERE review_id = ?`;

  const result = await db(updatedReview, values);

  if (result.affectedRows === 1)
    return res.status(200).json({ message: 'Review Updated Successfully' });

  next(new AppError('Something went wrong', 400));
});

exports.DeleteMyReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.body;
  if (!reviewId) return next(new AppError('ReviewId Id Is Required', 400));
  const updatedTime = moment().format('YYYY-MM-DD HH:mm:ss');

  const values = [0, updatedTime, reviewId];

  const updatedReview = `UPDATE product_review_rating_tbl SET  review_status = ?,review_updated_on = ? WHERE review_id = ?`;

  const result = await db(updatedReview, values);

  if (result.affectedRows === 1)
    return res.status(200).json({ message: 'Review Deleted Successfully' });

  next(new AppError('Something went wrong', 400));
});

const getReviewImageLink = (req, images) => {
  const parsedImages = JSON.parse(images);
  if (parsedImages && parsedImages.length > 0) {
    return parsedImages.map(
      (image) =>
        `${req.protocol}://${req.get('host')}/api/images/review/${image}`
    );
  } else {
    return [];
  }
};

exports.getProductReviews = catchAsync(async (req, res, next) => {
  const { productId, orderby = 'DESC' } = req.body;
  if (!productId) return next(new AppError('Product Id Is Required', 400));

  const values = [productId];

  const reviewQuery = `SELECT 
                              review_id,
                              customer_id,
                              azst_customer_fname,
                              azst_customer_lname,
                              review_title,
                              review_content,
                              review_points,
                              review_images,
                              is_modified,
                              DATE_FORMAT(review_created_on, '%d-%m-%Y %H:%i:%s') AS created_on,
                              DATE_FORMAT(review_updated_on, '%d-%m-%Y %H:%i:%s') AS updated_on
                        FROM product_review_rating_tbl
                        LEFT JOIN azst_customer ON product_review_rating_tbl.customer_id = azst_customer.azst_customer_id
                        WHERE review_status = 1   AND  review_approval_status = 1 AND product_id = ?
                        ORDER BY created_on ${orderby};
                      `;

  const result = await db(reviewQuery, values);
  if (result.length <= 0) return next(new AppError('No Reviews Found', 404));

  const modifiedReview = result.map((review) => ({
    ...review,
    review_images: getReviewImageLink(req, review.review_images),
  }));
  res.status(200).json(modifiedReview);
});

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const { productId, customerId, fromDate, toDate } = req.body;

  const filters = [];
  const values = [];

  if (productId) {
    filters.push('product_id = ?');
    values.push(productId);
  }
  if (customerId) {
    filters.push('customer_id = ?');
    values.push(customerId);
  }
  if (fromDate && toDate) {
    filters.push('review_created_on BETWEEN ? AND ?');
    values.push(fromDate, toDate);
  } else if (fromDate) {
    filters.push('review_created_on >= ?');
    values.push(fromDate);
  } else if (toDate) {
    filters.push('review_created_on <= ?');
    values.push(toDate);
  }

  const filtersQuery =
    filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

  const getQuery = `SELECT review_id,customer_id,product_id,review_title,review_content,review_points,review_status,
                      review_images,review_approval_status,approve_by, DATE_FORMAT(review_created_on, '%d-%m-%Y %H:%i:%s') AS created_on,
                      DATE_FORMAT(review_updated_on, '%d-%m-%Y %H:%i:%s') AS updated_on,DATE_FORMAT(approved_on, '%d-%m-%Y %H:%i:%s') AS approve_on,
                      azst_customer_fname,azst_customer_lname,product_title,image_src as product_image,url_handle
                    FROM product_review_rating_tbl
                    LEFT JOIN azst_customer ON product_review_rating_tbl.customer_id = azst_customer.azst_customer_id
                    LEFT JOIN azst_products ON product_review_rating_tbl.product_id = azst_products.id
                    WHERE review_status = 1 ${filtersQuery} ORDER BY created_on DESC`;

  const results = await db(getQuery, values);
  const modifiedReview = results.map((review) => ({
    ...review,
    review_images: getReviewImageLink(req, review.review_images),
    product_image: `${req.protocol}://${req.get('host')}/api/images/product/${
      review.product_image
    }`,
  }));
  res.status(200).json(modifiedReview);
});

exports.hanldeReviewApproval = catchAsync(async (req, res, next) => {
  const { isApproved, reviewId } = req.body;
  const { empId } = req;

  const reviewQuery = `UPDATE product_review_rating_tbl 
                        SET review_approval_status =?,approve_by = ?,approved_on = ?
                        WHERE review_id = ?`;
  const approvedTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [isApproved, empId, approvedTime, reviewId];

  const result = await db(reviewQuery, values);
  if (result.affectedRows > 0)
    return res.status(200).json({ message: 'Review Approved Successfully' });

  next(new AppError('Something went wrong', 400));
});
