const router = require('express').Router();

const categoryCtrl = require('../../controllers/AdminCtrls/categoryCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', categoryCtrl.getcategories);
router.use(authCtrl.protect);
router.post('/add', categoryCtrl.addcategory);

router.use(categoryCtrl.isCategoryExit);
router
  .route('/')
  .post(categoryCtrl.getCategory)
  .put(categoryCtrl.updatecategory)
  .patch(categoryCtrl.deletecategory);

module.exports = router;
