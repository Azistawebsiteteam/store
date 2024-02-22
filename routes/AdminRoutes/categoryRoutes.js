const router = require('express').Router();

const categoryCtrl = require('../../controllers/AdminCtrls/categoryCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', categoryCtrl.getcategories);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.post('/add', categoryCtrl.addcategory);

router.use(categoryCtrl.isCategoryExit);
router
  .route('/')
  .post(categoryCtrl.getCategory)
  .put(categoryCtrl.updatecategory)
  .patch(categoryCtrl.deletecategory);

module.exports = router;
