const router = require('express').Router();

const customerRoute = require('./customerRoutes');
const adminRoute = require('./AdminRoutes');

router.use('/admin', adminRoute);
router.use('/customer', customerRoute);

module.exports = router;
