const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const xss = require('xss-clean');
const compression = require('compression');

require('dotenv').config();
require('./dbconfig');

const globalErrorHandler = require('./controllers/errorController');

const authRoute = require('./routes/authRoutes');
const AppError = require('./Utils/appError');

const app = express();

const PORT = process.env.PORT || 5018;

app.use(bodyParser.json());
app.use(cors());

// Data sanitization against XSS
app.use(xss());
app.use(compression());

app.use('/api/v1/auth', authRoute);

app.all('*', (req, res, next) => {
  next(new AppError(`Cant't find ${req.originalUrl} on This Server`, 404));
});
app.use(globalErrorHandler);

app.listen(PORT, '192.168.212.138', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
