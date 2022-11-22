const wrapWithErrorMiddleware = (middleware, ErrorClass) => (req, res, next) => {
  const handleError = (error) => {
    // console.error('error', error);
    next(new ErrorClass(error.message));
  };
  const fakeNext = (arg) => (arg ? handleError(arg) : next(null));
  try {
    middleware(req, res, fakeNext);
  } catch (err) {
    handleError(err);
  }
};

module.exports = {
  wrapWithErrorMiddleware,
};
