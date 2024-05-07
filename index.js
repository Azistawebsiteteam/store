const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const xss = require('xss-clean');
const compression = require('compression');

require('dotenv').config();
require('./dbconfig');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./Utils/appError');

const authRoute = require('./routes/CustomerRoutes/authRoutes');
const profileRoute = require('./routes/CustomerRoutes/profileRoutes');
const adderessRoute = require('./routes/CustomerRoutes/adderessRoutes');

const adminAuthRoute = require('./routes/AdminRoutes/authRoutes');
const vendorRoute = require('./routes/AdminRoutes/vendorRoutes');
const collectionsRoute = require('./routes/AdminRoutes/collectionRoutes');
const brandRoute = require('./routes/AdminRoutes/brandRoutes');
const categoryRoute = require('./routes/AdminRoutes/categoryRoutes');
const tagRoute = require('./routes/AdminRoutes/tagsRoutes');
const bannerRoute = require('./routes/AdminRoutes/bannersRoutes');
const popupRoute = require('./routes/AdminRoutes/popupRoute');
const inventroyRoute = require('./routes/AdminRoutes/inventoryRoutes');

const productsRoute = require('./routes/Products/ProductsRoute');
const cartRoute = require('./routes/Products/cartRoute');
const whishListRoute = require('./routes/Products/whishlist');

const app = express();

process.on('uncaughtException', (err) => {
  console.log('uncaughtException shutting down server');
  process.exit(1);
});

const PORT = process.env.PORT || 5018;

app.use(bodyParser.json());
app.use(cors());

// Data sanitization against XSS
app.use(xss());
app.use(compression());

app.use('/brand/logs', express.static('Uploads/brandlogos'));
app.use('/product/thumbnail', express.static('Uploads/productImage'));
app.use('/product/images', express.static('Uploads/productImages'));
app.use('/product/variantimage', express.static('Uploads/variantImage'));
app.use('/variant/barcode/image', express.static('Uploads/variantbarcode'));
app.use('/banners', express.static('Uploads/bannerImages'));
app.use('/collection', express.static('Uploads/CollectionImages'));
app.use('/admin/profile', express.static('Uploads/AdminImages'));
app.use('/popup/image', express.static('Uploads/PopupImages'));

const api = process.env.APP_API;

app.use(`${api}/auth`, authRoute);
app.use(`${api}/address`, adderessRoute);
app.use(`${api}/profile`, profileRoute);

app.use(`${api}/adminauth`, adminAuthRoute);
app.use(`${api}/vendors`, vendorRoute);
app.use(`${api}/collections`, collectionsRoute);
app.use(`${api}/brands`, brandRoute);
app.use(`${api}/category`, categoryRoute);
app.use(`${api}/tags`, tagRoute);
app.use(`${api}/banners`, bannerRoute);
app.use(`${api}/popups`, popupRoute);
app.use(`${api}/inventory`, inventroyRoute);

app.use(`${api}/product`, productsRoute);
app.use(`${api}/whish-list`, whishListRoute);
app.use(`${api}/cart`, cartRoute);

app.get('/favicon.ico', (req, res) => res.status(204));

app.all('*', (req, res, next) => {
  next(new AppError(`Cant't find ${req.originalUrl} on This Server`, 404));
});

app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => {
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('process Terminated ');
  });
});
