class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.message = message || 'Internal Server Error';
    this.isOperationl = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
