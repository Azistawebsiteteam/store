const router = require('express').Router();

const brandCtrl = require('../../controllers/AdminCtrls/brandsCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', brandCtrl.getbrands);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add',
  brandCtrl.uploadImage,
  brandCtrl.storeImage,
  brandCtrl.addBrnad
);

router.put(
  '/',
  brandCtrl.uploadImage,
  brandCtrl.isBrandExit,
  brandCtrl.updateImage,
  brandCtrl.updateBrand
);

router.use(brandCtrl.isBrandExit);
router.route('/').post(brandCtrl.getbrand).patch(brandCtrl.deleteBrand);

module.exports = router;
