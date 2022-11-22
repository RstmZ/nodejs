function asyncWrapper(asyncRouteHandler) {
  return function routeHandler(request, response, next) {
    return (
      asyncRouteHandler(request, response, next)
        .catch(next)
    );
  };
}

module.exports = {
  asyncWrapper,
};
