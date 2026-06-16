const AppError = require('./AppError');

const prismaErrorMapper = (err) => {
  // Prisma Known Request Error
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002':
        // Unique constraint failed
        const field = err.meta?.target ? err.meta.target.join(', ') : 'field';
        return new AppError(
          `Duplicate field value: ${field}. Please use another value.`,
          409,
          'DUPLICATE_ENTRY',
          { target: err.meta?.target }
        );
      case 'P2003':
        // Foreign key constraint failed
        return new AppError(
          'Foreign key constraint failed. A related record does not exist or cannot be modified.',
          422,
          'FOREIGN_KEY_CONSTRAINT',
          { field_name: err.meta?.field_name }
        );
      case 'P2025':
        // Record not found
        return new AppError(
          err.meta?.cause || 'Record not found.',
          404,
          'NOT_FOUND'
        );
      default:
        return new AppError(
          `Database error: ${err.message}`,
          400,
          `DATABASE_ERROR_${err.code}`
        );
    }
  }

  // Prisma Validation Error
  if (err.name === 'PrismaClientValidationError') {
    return new AppError(
      'Invalid input provided to the database.',
      400,
      'VALIDATION_ERROR'
    );
  }

  // If it's an unrecognized Prisma error or generic error, return as-is to be handled by default logic
  return err;
};

module.exports = prismaErrorMapper;
