const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const ValidationCtrl = require('../../Models/Review');
const reviewCtrl = require('../../controllers/reviewCtrl');

const key = process.env.JWT_SECRET;

router.post('/product', multer().any(), reviewCtrl.getProductReviews);

router.use(authCtrl.protect(key));

router.post(
  '/create/review',
  reviewCtrl.uploadImage,
  ValidationCtrl.reviewValidation,
  reviewCtrl.storeImage,
  reviewCtrl.createReview
);

router.post(
  '/update/review',
  reviewCtrl.uploadImage,
  ValidationCtrl.updateVliadation,
  reviewCtrl.isReviewExist,
  reviewCtrl.storeImage,
  reviewCtrl.updateReview
);
//router.use(reviewCtrl.isReviewExist);
router.use(multer().any());
router.post('/delete/review', reviewCtrl.DeleteMyReview);
router.get('/get/review', reviewCtrl.updateReview);

module.exports = router;
