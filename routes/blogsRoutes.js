const express = require('express');

const blogController = require('../controllers/blogsCtrl');
const authCtrl = require('../controllers/authController');
const blogValidationCtrl = require('../Models/blog');

const router = express.Router();

const key = process.env.JWT_SECRET_ADMIN;

// Route to get all blogs
router.get('/customer', blogController.getAllBlogs);

// Routes with blog existence check middleware
router.post(
  '/customer',
  blogController.isBlogExist,
  blogController.getBlogById
);

// Middleware to protect all routes
router.use(authCtrl.protect(key));

// Route to get all blogs
router.get('/', blogController.getAllBlogs);

// Routes with blog existence check middleware
router.use('/:id', blogController.isBlogExist);

router.get('/:id', blogController.getBlogById);

// Route to create a blog with image upload and store
router.post(
  '/',
  blogController.uploadblogImg,
  blogValidationCtrl,
  blogController.storeBlogImgs,
  blogController.createBlog
);

// Route to update a blog with image upload and update
router.put(
  '/',
  blogController.uploadblogImg,
  blogValidationCtrl,
  blogController.isBlogExist,
  blogController.updateStoreBlogImgs,
  blogController.updateBlog
);

// Route to delete a blog
router.patch('/:id', blogController.deleteBlog);

module.exports = router;
