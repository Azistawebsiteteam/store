const router = require('express').Router();

const authCtrl = require('../../controllers/authController');

const {
  isExistInWl,
  addToWl,
  removeFromWl,
  getWhishlist,
} = require('../../controllers/wishLIstCtrl');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

router.post('/', getWhishlist);
router.post('/add', isExistInWl, addToWl);
router.post('/remove', removeFromWl);

module.exports = router;
