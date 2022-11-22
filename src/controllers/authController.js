const express = require('express');
const {
  registration,
  signIn,
  sendLink,
  isValidToken,
  createPaymentMethod,
  createSession,
  updateSessionUser,
  infoUser,
  isLoggedIn
} = require('../services/authService');
const { asyncWrapper } = require('../utils/apiUtils');
const { registrationValidator, authValidator, paymentMethodCreateValidator } = require('../middlewares/validationMiddleware');
const { facebookRouter } = require('./facebookController');
const { googleRouter } = require('./googleController');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');

const { createCustomer, createSubscription, getPriceById } = require('../services/stripeService');
const { createProfile, savePromoCode } = require('../services/profileService');

const { sendDemo } = require('../services/mailService');
const { getGoogleAnalytics } = require('../services/googleAnalitics');
const { createUserTeam } = require('../services/userTeamService');
const { getUser } = require('../services/userService'); 
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');

const authRouter = express.Router();

authRouter.get('/generatePromoCode', userSessionMiddleware, async (req, res) => {
  const response = await savePromoCode()

  res.json(response)
})

// Info Logged In user
authRouter.get('/isLoggedIn', invitationTokenMiddleware, async (req, res) => {
  const { menu } = req.query;
  const ownerId = req.invitationUserId;

  const { id, email, firstName, picture, subscriptionIsActive, profileId, showDocument, showCampaign } = await getUser(ownerId);

  const result = await isLoggedIn(id, email, firstName, picture, subscriptionIsActive, profileId);

  if (result.code) {
    return res.status(400).json(result)
  }
  let newAccount = false
  if (menu) {
    const user = await getUser(id)
    if (user.isMenu == false) {
      newAccount = true
      await user.update({ isMenu: true })
    }
  }
  return res.json({ ...result, newAccount, showDocument, showCampaign })
});

authRouter.get('/logout', async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.status(400).json({ code: 1000 })
  }
  await updateSessionUser(user.id)
  req.session.destroy();
  res.json({ message: 'Logged out.' });
});

// User registration, customer creation, 
// stripe subscription creation and profile creation
authRouter.post('/register', registrationValidator, asyncWrapper(async (req, res) => {
  const {
    email,
    password,
    priceId,
    type,
    firstName,
    lastName,
    organization,
    city
  } = req.body;

  const domain = email.split('@').pop();
  const edu = domain.split('.').pop();

  if (type == "Student" && edu != 'edu') {
    return res.status(400).json({
      code: 'Unfortunately, the e-mail you entered doesn`t have .edu domain'
    })
  }
  // creation user
  const user = await registration(email, password, '', firstName, lastName, organization, city);
  req.session.user = user;

  await createSession(user.id)

  if (priceId && type) {
    // creation customer
    const customer = await createCustomer(user.id, user.email);
    // creation subscription
    await createSubscription(user.id, customer.customerId, priceId);

    const { recurring: interval } = await getPriceById(priceId)
    // creation profile
    const profile = await createProfile(user.id, type, interval.interval);

    await createUserTeam(user.id, email, 'Admin', firstName);

    // if (user && type == 'Start') {
    //   await sendEmailStartFreeTrial(email, firstName);
    // }
    return res.json({
      message: 'Profile created successfully!',
      user,
      profile,
    });
  }

  res.json({
    message: 'User created successfully!',
    user
  });
}));

// User authentication
authRouter.post('/login', authValidator, asyncWrapper(async (req, res) => {
  const { email, password } = req.body;

  const user = await signIn(email, password);
  req.session.user = user;

  await createSession(user.id)

  res.json({ message: 'Logged in successfully!', user });
}));

// Invitation for an unregistered user
authRouter.post('/invitation', asyncWrapper(async (req, res) => {
  const { id, firstName } = req.session.user
  const { email, url_sharing, company_sender } = req.body;
  const { status, ...result } = await sendLink(email, url_sharing, company_sender, id, firstName);
  res.status(status).json(result);
}));

// Checking the token for validity
authRouter.post('/checkToken', asyncWrapper(async (req, res) => {
  const { token } = req.body;
  const result = await isValidToken(token);
  res.json({ result });
}));

// Create payment method 'PayPal' or 'Credit card'
authRouter.post('/paymentMethod', userSessionMiddleware, paymentMethodCreateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { methodPayment, priceId } = req.body;
  const result = await createPaymentMethod(ownerId, methodPayment, priceId);
  res.json({ result });
}));

authRouter.get('/infoUser', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id, createdAt } = req.session.user;
  const response = await infoUser(id, createdAt)
  res.json(response)
}));

authRouter.get('/analytics', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const response = await getGoogleAnalytics()
  res.json(response)
}));

authRouter.post('/demo', asyncWrapper(async (req, res) => {
  const { plan, name, phone, email, company, message } = req.body;

  const { status, ...response } = await sendDemo(plan, name, phone, email, company, message);

  res.status(status).json(response);
}));

authRouter.post('/subscribe', asyncWrapper(async (req, res) => {
  const { email } = req.body;
  const message = 'I want to subscribe to Your Newslatter to Stay Up to Date on Our Latest News'
  const { status, ...response } = await sendDemo('subscribe', 'New user', '', email, '', message);

  res.status(status).json(response);
}));


// Authentication via google
authRouter.use('/google', googleRouter);

// Authentication via facebook
authRouter.use('/facebook', facebookRouter);

module.exports = {
  authRouter,
};
