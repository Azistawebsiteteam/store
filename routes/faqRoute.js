const router = require('express').Router();
const multer = require('multer');

const faqCtrl = require('../controllers/faqCtrl');
const authCtrl = require('../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(multer().any());
// Route to get all blogs by customer
router.get('/customer', faqCtrl.getFaqs);
router.post('/customer/faq', faqCtrl.isExist, faqCtrl.getFaq);

// Middleware to protect all routes
router.use(authCtrl.protect(key));

// all blogs are under Admin Controller
router.post('/faq', faqCtrl.isExist, faqCtrl.getFaq);
router
  .route('/')
  .get(faqCtrl.getFaqs)
  .post(faqCtrl.createFaq)
  .put(faqCtrl.isExist, faqCtrl.updateFaq)
  .patch(faqCtrl.isExist, faqCtrl.deleteFaq);

module.exports = router;
