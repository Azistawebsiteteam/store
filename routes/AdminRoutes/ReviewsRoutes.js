const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
//const ValidationCtrl = require('../../Models/Review');
const reviewCtrl = require('../../controllers/reviewCtrl');

const key = process.env.JWT_SECRET_ADMIN;
router.use(authCtrl.protect(key));

router.use(multer().any());

router.post('/approve', reviewCtrl.hanldeReviewApproval);
router.post('/get/reviews', reviewCtrl.getAllReviews);

module.exports = router;
