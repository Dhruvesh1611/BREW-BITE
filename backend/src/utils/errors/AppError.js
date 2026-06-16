class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Indicates this is an expected, handled error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
