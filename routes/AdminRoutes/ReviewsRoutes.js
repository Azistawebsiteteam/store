const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const reviewCtrl = require('../../controllers/reviewCtrl');

const key = process.env.JWT_SECRET_ADMIN;
router.use(authCtrl.protect(key));

router.use(multer().any());

router.post('/review', reviewCtrl.getReviewData);
router.post('/approve', reviewCtrl.hanldeReviewApproval);
router.post('/all', reviewCtrl.getAllReviews);

module.exports = router;
