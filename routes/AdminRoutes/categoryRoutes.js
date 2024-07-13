const router = require('express').Router();
const multer = require('multer');
const categoryCtrl = require('../../controllers/AdminCtrls/categoryCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', categoryCtrl.getcategories);
router.post('/sub-categories', categoryCtrl.getSubcategories);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add',
  categoryCtrl.uploadImage,
  categoryCtrl.storeImage,
  categoryCtrl.addcategory
);
router.put(
  '/',
  categoryCtrl.uploadImage,
  categoryCtrl.isCategoryExit,
  categoryCtrl.updateImage,
  categoryCtrl.updatecategory
);

router.use(multer().any());
router.post('/add-sub', categoryCtrl.addSubCategory);
router.post('/data/categories', categoryCtrl.getAdminSubCategories);

router.post('/edit', categoryCtrl.updateSubCategory);
router.post('/delete-sub', categoryCtrl.deleteSubCategory);
router.post('/get-sub', categoryCtrl.getSubCategory);

router.use(categoryCtrl.isCategoryExit);
router
  .route('/')
  .post(categoryCtrl.getCategory)

  .patch(categoryCtrl.deletecategory);

module.exports = router;
