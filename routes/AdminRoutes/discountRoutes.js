const router = require('express').Router();
const multer = require('multer');

const discCtrl = require('../../controllers/DiscountCtrl/productDiscCtrl');
const xyDiscCtrl = require('../../controllers/DiscountCtrl/buyXgetYCtrl');
const disSchemaCtrl = require('../../Models/disscount');

const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.use(multer().any());

//disSchemaCtrl.validateDiscount,
router.post('/create', discCtrl.createDiscount);

// router.post(
//   '/xy/create',
//   disSchemaCtrl.validateXYDiscount,
//   xyDiscCtrl.createDiscount
// );

// router
//   .route('/')
//   .get(discCtrl.getDiscounts)
//   .post(discCtrl.discountDetails)
//   .put(discCtrl.UpdateDiscount)
//   .patch(discCtrl.deleteDiscount);

// router.get('/xy', xyDiscCtrl.getDiscounts); // Handle GET requests to /xy
// router.use(xyDiscCtrl.isExist); // Middleware for checking existence
// router
//   .route('/xy')
//   .post(xyDiscCtrl.getDiscount) // Handle POST requests to /xy
//   .put(xyDiscCtrl.updateDiscount) // Handle PUT requests to /xy with validation
//   .patch(xyDiscCtrl.deleteDiscount); // Handle PATCH requests to /xy

module.exports = router;
