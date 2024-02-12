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

const app = express();

const PORT = process.env.PORT || 5018;

app.use(bodyParser.json());
app.use(cors());

// Data sanitization against XSS
app.use(xss());
app.use(compression());

app.use('/brand/logs', express.static('Uploads/brandlogos'));

app.use('/api/v1/auth', authRoute);
app.use('/api/v1/address', adderessRoute);
app.use('/api/v1/profile', profileRoute);

app.use('/api/v1/adminauth', adminAuthRoute);
app.use('/api/v1/vendors', vendorRoute);
app.use('/api/v1/collections', collectionsRoute);
app.use('/api/v1/brands', brandRoute);
app.use('/api/v1/category', categoryRoute);
app.use('/api/v1/tags', tagRoute);

app.all('*', (req, res, next) => {
  next(new AppError(`Cant't find ${req.originalUrl} on This Server`, 404));
});
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
