const { createErrorMessage } = require("../services/errorMessageService");

class AppError extends Error {}

class InvalidRequestError extends AppError {
  constructor(message = 'Invalid request', user='') {
    super(message);
    createErrorMessage(user, message)
  }
}

class ValidationError extends AppError {
  constructor(message, user='') {
    super(message);
    this.name = 'Validation Error';
    createErrorMessage(user, message)
  }
}

class ForbiddenError extends AppError {
  constructor(message, user='') {
    super(message);
    this.name = 'Forbidden Error';
    createErrorMessage(user, message)
  }
}

class NotFoundError extends AppError {
  constructor(message, user='') {
    super(message);
    this.name = 'Not Found Error';
    createErrorMessage(user, message)
  }
}

module.exports = {
  AppError,
  InvalidRequestError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
};
