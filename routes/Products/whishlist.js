const router = require('express').Router();

const authCtrl = require('../../controllers/authController');

const {
  isExistInWl,
  addToWl,
  removeFromWl,
  getWishlist,
} = require('../../controllers/wishLIstCtrl');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

router.post('/', getWishlist);
router.post('/add', isExistInWl, addToWl);
router.post('/remove', removeFromWl);

module.exports = router;
