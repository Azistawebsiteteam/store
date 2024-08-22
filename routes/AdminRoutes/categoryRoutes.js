const router = require('express').Router();
const multer = require('multer');
const categoryCtrl = require('../../controllers/AdminCtrls/categoryCtrl');
const authCtrl = require('../../controllers/authController');
const validateCategory = require('../../Models/category');

router.get('/data', categoryCtrl.getCategories);
router.post('/sub-categories', categoryCtrl.getSubcategories);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add',
  categoryCtrl.uploadImage,
  validateCategory,
  categoryCtrl.storeImage,
  categoryCtrl.addCategory,
  categoryCtrl.addSubCategory
);
router.put(
  '/',
  categoryCtrl.uploadImage,
  validateCategory,
  categoryCtrl.isCategoryExist,
  categoryCtrl.updateImage,
  categoryCtrl.updateCategory,
  categoryCtrl.addSubCategory
);

router.use(multer().any());

router.use(categoryCtrl.isCategoryExist);
router
  .route('/')
  .post(categoryCtrl.getCategory)
  .patch(categoryCtrl.deleteCategory);

module.exports = router;
