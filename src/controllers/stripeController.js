const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  createCustomer,
  createSubscription,
  webhook,
  getBalance,
  downloadBalance,
  updateSubscription,
  getPrice,
  createPaymentResult,
  isValidPromoCode,
  getPriceById
} = require('../services/stripeService');
const { sendBusinessRequest } = require('../services/mailService');
const { asyncWrapper } = require('../utils/apiUtils');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const { getUser } = require('../services/userService');
const { getPromoCode, savePromo } = require('../services/profileService');

const stripeRouter = express.Router();

// Get balance transactions
stripeRouter.get('/history', asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const balance = await getBalance(ownerId);
  res.json(balance);
}));

// Download balance transactions  
stripeRouter.get('/downloadBalance', asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const balance = await downloadBalance(ownerId);
  res.json(balance);
}));

// Get price
stripeRouter.get('/prices', asyncWrapper(async (req, res) => {
  const prices = await getPrice();
  res.json(prices);
}));

// Creating a customer
stripeRouter.post('/createCustomer', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id: ownerId, email } = req.session.user;
  const customer = await createCustomer(ownerId, email);
  req.session.user.customerId = customer.customerId;
  res.json(customer);
}));

// Creating a subscription to stripe: trial period 7 days
stripeRouter.post('/createSubscription', asyncWrapper(async (req, res) => {
  const { id: ownerId, customerId } = req.session.user;
  const { priceId } = req.body;
  const response = await createSubscription(ownerId, customerId, priceId);
  res.json(response);
}));

// Create business request and send email by Postmark Api
stripeRouter.post('/business', asyncWrapper(async (req, res) => {
  const {
    name,
    email,
    phone,
    message,
  } = req.body;
  const { status, ...response } = await sendBusinessRequest(name, email, phone, message);
  res.status(status).json(response);
}));

const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post('/', express.raw({ type: 'application/json' }), asyncWrapper(async (req, res) => {
  const response = await webhook(req);
  res.json(response);
}));

// create payment by stripe
stripeRouter.post('/createPayment', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id, firstName, email } = req.session.user;
  const { paymentMethodId, status, paymentId, promoCode, profileId } = req.body;
  const { subscriptionId } = await getUser(id)

  const payment = await createPaymentResult(id, subscriptionId, email, firstName, paymentMethodId, status, paymentId, promoCode, profileId);

  if (payment?.code) return res.status(400).json(payment)
  res.json(payment);
}));

stripeRouter.put('/updateSub', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const { subscriptionId, customerId } = await getUser(ownerId);

  const { priceId } = req.body;
  const payment = await updateSubscription(subscriptionId, priceId, ownerId, customerId);
  const user = await getUser(ownerId);

  req.session.user = user;

  res.json(payment);
}));

stripeRouter.get('/', asyncWrapper(async (req, res) => {
  const promoCode = await getPromoCode()
  res.json(promoCode)
}));

stripeRouter.post('/promoCode', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id: ownerId } = req.session.user;
  const { promoCode, period } = req.body;
  const result = await isValidPromoCode(ownerId, promoCode, period);
  if (result?.code) return res.status(400).json(result)
  res.json(result);
}));


stripeRouter.post('/savePromoCode', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { promoCode, type } = req.body;
  const result = await savePromo(promoCode, type);
  res.json(result);
}));


module.exports = {
  stripeRouter,
  stripeWebhookRouter,
};
