const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { resetValidator } = require('../middlewares/validationMiddleware');

const { recover, reset } = require('../services/authService');
const { changePassword } = require('../services/userService');
const { asyncWrapper } = require('../utils/apiUtils');

const passwordRouter = express.Router();

// recover password
passwordRouter.post('/recover', resetValidator, asyncWrapper(async (req, res) => {
  const { email, redirect } = req.body
  const response = await recover(email, redirect);
  res.json(response);
}));

// reset password by token
passwordRouter.post('/reset/:token', asyncWrapper(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  await reset(token, password);
  res.status(200).json({ message: 'Success!' });
}));

passwordRouter.post('/change', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id } = req.session.user;
  const { password } = req.body;
  const { message } = await changePassword(id, password);
  res.status(200).json({ message });
}));

passwordRouter.post('/test', userSessionMiddleware, asyncWrapper(async (req, res) => {
  // const { id } = req.session.user;
  const { password, id } = req.body;
  const { message } = await changePassword(id, password);
  res.status(200).json({ message });
}));

module.exports = {
  passwordRouter,
};
