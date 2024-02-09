const AppError = require('./../Utils/appError');

const handleCatEroorDB = (err) => {
  const message = `Invalid  ${err.path}  ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err, res) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJsonWebTokenError = (err) =>
  new AppError(`${err.message} Please Login again`, 401);
const handleTokenExpiredError = (err) =>
  new AppError('your Token Expired Please login again!', 401);

const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrPord = (err, res) => {
  // Operational , trusted error: send messsage to client

  if (err.isOperationl) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other error occurred dont take error details
    // 1) Log ERR
    //console.error('ERROR', err);
    // 2) Send generic error message
    res.status(500).json({
      status: 'error',
      message: 'Something Went Worng',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.error(err);
  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };

    if (error.name === 'CastError') error = handleCatEroorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err._message === 'User validation failed')
      error = handleValidationErrDB(error);
    if (error.name === 'JsonWebTokenError')
      error = handleJsonWebTokenError(error);
    if (error.name === 'TokenExpiredError')
      error = handleTokenExpiredError(error);
    sendErrPord(err, res);
  }
};
