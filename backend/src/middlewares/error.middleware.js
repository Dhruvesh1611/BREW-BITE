const AppError = require('../utils/errors/AppError');
const prismaErrorMapper = require('../utils/errors/prismaErrorMapper');
const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // 1. Map Prisma Errors
  error = prismaErrorMapper(error);

  // 2. Map Zod Validation Errors
  if (error instanceof ZodError || error.name === 'ZodError') {
    const details = error.errors ? error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    })) : {};
    
    error = new AppError(
      'Invalid input data.',
      422,
      'VALIDATION_ERROR',
      details
    );
  }

  // Log error internally (can be swapped for a real logger like Winston/Pino)
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ [Error]:', err);
  }

  // 3. Fallback for unhandled operational errors
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';
  const details = error.details || {};

  // Prevent stack traces from leaking to client
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    details
  });
};

module.exports = { errorHandler };