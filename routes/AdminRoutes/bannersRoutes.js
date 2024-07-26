const router = require('express').Router();

const authCtrl = require('../../controllers/authController');
const bannerCtrl = require('../../controllers/AdminCtrls/BannersCtrl/bannersCtrl');
const productBnrCtrl = require('../../controllers/AdminCtrls/BannersCtrl/productBanner');

router.get('/data', bannerCtrl.getbanners);
router.get('/product', productBnrCtrl.getbanners);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add',
  bannerCtrl.uploadbanner,
  bannerCtrl.storebanner,
  bannerCtrl.addBanner
);

router.post(
  '/update',
  bannerCtrl.uploadbanner,
  bannerCtrl.isBannerExist,
  bannerCtrl.updatestorebanner,
  bannerCtrl.updateBanner
);
router.get('/', bannerCtrl.getAllBanners);
router.get('/product/all', productBnrCtrl.getAllBanners);

router.put('/', bannerCtrl.hideBanner);

router.use(bannerCtrl.isBannerExist);

router.route('/').post(bannerCtrl.getbanner).delete(bannerCtrl.deleteBanner);

module.exports = router;
