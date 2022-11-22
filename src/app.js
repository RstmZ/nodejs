const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();
const passport = require('passport');
const cors = require('cors');
const { myStore } = require('./models/dbInit');

const logger = require('./winston');
const {
  AppError, NotFoundError, ForbiddenError,
} = require('./utils/errors');

const { stripeRouter, stripeWebhookRouter } = require('./controllers/stripeController');
const { authRouter } = require('./controllers/authController');
const { passwordRouter } = require('./controllers/passwordController');
const { memberRouter } = require('./controllers/userController');
const { campaignRouter } = require('./controllers/campaignController');
const { uploadRouter } = require('./controllers/uploadController');
const { recognizeRouter } = require('./controllers/recognizeController');
const { fileRouter } = require('./controllers/fileController');
const { pitchRouter } = require('./controllers/pitchController');
const { textRouter } = require('./controllers/textController');
const { contactRouter } = require('./controllers/contactController');
const { contactListRouter } = require('./controllers/contactListController');
const { dashboardRouter } = require('./controllers/dashboardController');
const { trendingNewsRouter } = require('./controllers/trendingNewsController');
const { faqRouter } = require('./controllers/faqController');
const { notificationRouter } = require('./controllers/notificationController');
const { utilsRouter } = require('./controllers/utilsController');
const { recaptchaRouter } = require('./controllers/reCaptchaController');
const { signatureRouter } = require('./controllers/signatureController');
const { statRouter } = require('./controllers/statController');
const { mailRouter } = require('./controllers/mailController');
const { testRouter } = require('./controllers/testRoute');
const { paypalRouter } = require('./controllers/paypalController');
const { animateRouter } = require('./controllers/animateController');
const { profileRouter } = require('./controllers/profileController');
const { verifyRouter } = require('./controllers/verifyController');

const app = express();
app.use(morgan('dev'));
app.use(cors());

app.use(session({
  secret: process.env.COOKIE_SECRET,
  store: myStore,
  cookie: {
    path: '/',
    httpOnly: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use('/stripe-webhook', stripeWebhookRouter);

app.use(express.json());

app.use('/stripe', stripeRouter);
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/verify', verifyRouter);
app.use('/password', passwordRouter);
app.use('/user', memberRouter);
app.use('/campaign', campaignRouter);
app.use('/upload', uploadRouter);
app.use('/recognize', recognizeRouter);
app.use('/pitch', pitchRouter);
app.use('/', fileRouter);
app.use('/text', textRouter);
app.use('/contacts', contactRouter);
app.use('/lists', contactListRouter);
app.use('/dashboard', dashboardRouter);
app.use('/trendingNews', trendingNewsRouter);
app.use('/faq', faqRouter);
app.use('/notifications', notificationRouter);
app.use('/utils', utilsRouter);
app.use('/test', testRouter);
app.use('/recaptcha', recaptchaRouter);
app.use('/signature', signatureRouter);
app.use('/stat', statRouter);
app.use('/mail', mailRouter);
app.use('/paypal', paypalRouter);
app.use('/animate', animateRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// eslint-disable-next-line
app.use((err, req, res, next) => {
  logger.error(err.stack);
  if (err instanceof AppError) {
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ message: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Internal server error.' });
});

(async () => {
  try {
    app.listen(8080);
  } catch (err) {
    console.error(`Error on server startup: ${err.message}`);
  }
})();

module.exports = app; // for test