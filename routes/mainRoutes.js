const router = require('express').Router();

const authRoute = require('./CustomerRoutes/authRoutes');
const profileRoute = require('./CustomerRoutes/profileRoutes');
const adderessRoute = require('./CustomerRoutes/adderessRoutes');

const adminAuthRoute = require('./AdminRoutes/authRoutes');
const vendorRoute = require('./AdminRoutes/vendorRoutes');
const collectionsRoute = require('./AdminRoutes/collectionRoutes');
const brandRoute = require('./AdminRoutes/brandRoutes');
const categoryRoute = require('./AdminRoutes/categoryRoutes');
const tagRoute = require('./AdminRoutes/tagsRoutes');
const bannerRoute = require('./AdminRoutes/bannersRoutes');
const popupRoute = require('./AdminRoutes/popupRoute');
const inventroyRoute = require('./AdminRoutes/inventoryRoutes');
const discountRoute = require('./AdminRoutes/discountRoutes');

const productsRoute = require('./Products/ProductsRoute');
const cartRoute = require('./Products/cartRoute');
const whishListRoute = require('./Products/whishlist');
const reviewsRoute = require('./CustomerRoutes/ReviewRoute');
const reviewsRouteAdmin = require('./AdminRoutes/ReviewsRoutes');
const adminUsersRoute = require('./AdminRoutes/customerRoutes');
const announcementsRoute = require('./AdminRoutes/announcementBarRoutes');
const orderRoutes = require('./ordersRoutes/orderRoute');
const customerDiscountRoute = require('./CustomerRoutes/discountRoutes');
const blogRoute = require('./blogsRoutes');
const faqRoute = require('./faqRoute');
const callBackRoute = require('./callBackRoutes');

router.use('/auth', authRoute);
router.use('/address', adderessRoute);
router.use('/profile', profileRoute);

router.use('/adminauth', adminAuthRoute);
router.use('/vendors', vendorRoute);
router.use('/collections', collectionsRoute);
router.use('/brands', brandRoute);
router.use('/category', categoryRoute);
router.use('/tags', tagRoute);
router.use('/banners', bannerRoute);
router.use('/popups', popupRoute);
router.use('/inventory', inventroyRoute);

router.use('/product', productsRoute);
router.use('/whish-list', whishListRoute);
router.use('/cart', cartRoute);
router.use('/reviews', reviewsRoute);
router.use('/admin/reviews', reviewsRouteAdmin);
router.use('/users', adminUsersRoute);
router.use('/announcement', announcementsRoute);
router.use('/orders', orderRoutes);
router.use('/discount', discountRoute);
router.use('/customer/discount', customerDiscountRoute);

router.use('/blogs', blogRoute);
router.use('/faqs', faqRoute);
router.use('/cb', callBackRoute);

module.exports = router;
