const AppError = require('../Utils/appError');

const handleDatabaseError = (message) => new AppError(message, 400);

const handleJsonWebTokenError = (message) =>
  new AppError(`${message} Please Login again`, 401);
const handleTokenExpiredError = () =>
  new AppError('your Token Expired Please login again!', 401);

const handleMulterError = (err) => {
  new AppError(err.message ?? 'Error while uploading files', 400);
};

const handleECONNRESETError = () => new AppError('ECONNRESETError', 500);

const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrPord = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.log(err);
  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.sqlState) err = handleDatabaseError(err.sqlMessage);
    if (err.name === 'JsonWebTokenError')
      err = handleJsonWebTokenError(err.message);
    if (err.name === 'TokenExpiredError') err = handleTokenExpiredError();
    if (err.errno === -4077) err = handleECONNRESETError();
    if (err.name === 'MulterError') err = handleMulterError(err);
    sendErrPord(err, res);
  }
};
