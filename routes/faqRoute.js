const router = require('express').Router();
const multer = require('multer');

const faqCtrl = require('../controllers/faqCtrl');
const authCtrl = require('../controllers/authController');
const faqValidation = require('../Models/faq');

const key = process.env.JWT_SECRET_ADMIN;

router.use(multer().any());
// Route to get all blogs by customer
router.get('/customer', faqCtrl.getFaqsCustomer);
router.post('/customer/faq', faqCtrl.isExist, faqCtrl.getFaq);
router.post('/customer/product', faqCtrl.getProductFaq);

// Middleware to protect all routes
router.use(authCtrl.protect(key));

// all blogs are under Admin Controller
router.post('/faq', faqCtrl.isExist, faqCtrl.getFaq);
router.post('/admin', faqCtrl.getFaqs);
router
  .route('/')
  .post(faqValidation, faqCtrl.createFaq)
  .put(faqValidation, faqCtrl.isExist, faqCtrl.updateFaq)
  .patch(faqCtrl.isExist, faqCtrl.deleteFaq);

module.exports = router;
