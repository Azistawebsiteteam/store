const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const xss = require('xss-clean');
const compression = require('compression');

require('dotenv').config();
require('./dbconfig');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./Utils/appError');

const mainRoute = require('./routes/mainRoutes');
const imagesRoute = require('./routes/imagesRoutes');

const app = express();

process.on('uncaughtException', (err) => {
  console.log(err);
  console.log('Uncaught exception! Shutting down...');
  process.exit(1);
});

const PORT = process.env.PORT || 5018;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(xss());
app.use(compression());

// Routes
app.use('/api/images', imagesRoute);
app.use(`${process.env.APP_API}`, mainRoute);

// Handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204));

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling
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
    console.log('Process terminated!');
  });
});
