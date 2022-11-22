const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { faqCreateValidator } = require('../middlewares/validationMiddleware');
const { sendFaq } = require('../services/mailService');
const { asyncWrapper } = require('../utils/apiUtils');

const faqRouter = express.Router();

// Get faqs
faqRouter.post('/', faqCreateValidator, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { email } = req.session.user;
  const { type, message } = req.body;
  const { status, ...response } = await sendFaq(email, type, message);

  res.status(status).json(response);
}));

module.exports = {
  faqRouter,
};
