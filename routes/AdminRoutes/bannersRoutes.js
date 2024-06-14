const router = require('express').Router();

const bannerCtrl = require('../../controllers/AdminCtrls/bannersCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', bannerCtrl.getbanners);

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

router.put('/', bannerCtrl.hideBanner);

router.use(bannerCtrl.isBannerExist);

router.route('/').post(bannerCtrl.getbanner).delete(bannerCtrl.deleteBanner);

module.exports = router;
