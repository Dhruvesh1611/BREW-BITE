function isPrismaDatabaseUnavailable(error) {
  return Boolean(
    error && (
      error.code === 'P1001' ||
      error.code === 'P1017' ||
      /Can't reach database server/i.test(error.message || '') ||
      /The database server at .* refused/i.test(error.message || '') ||
      /database system is starting up/i.test(error.message || '')
    )
  );
}

module.exports = { isPrismaDatabaseUnavailable };