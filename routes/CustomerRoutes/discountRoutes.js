const router = require('express').Router();
const multer = require('multer');

const discCtrl = require('../../controllers/DiscountCtrl/EligibleCrtl');

const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post('/', discCtrl.getEligibleDiscounts);

module.exports = router;
