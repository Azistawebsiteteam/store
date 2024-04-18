const router = require('express').Router();

const popupCtrl = require('../../controllers/AdminCtrls/PopupCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/current/popup', popupCtrl.currentPopup);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.get('/data', popupCtrl.getPopups);

router.post(
  '/create',
  popupCtrl.uploadImage,
  popupCtrl.storeImage,
  popupCtrl.addPopup
);

router.put(
  '/',
  popupCtrl.uploadImage,
  popupCtrl.isPopupExist,
  popupCtrl.updateImage,
  popupCtrl.updatePopup
);

router.use(popupCtrl.isPopupExist);

router.route('/').post(popupCtrl.getPopup).patch(popupCtrl.deletePopup);

module.exports = router;
