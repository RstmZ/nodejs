const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const { upsertFacabookRegister, signInSocialNetwork } = require('../services/authService');

const { FACEBOOK_CLIENT_ID, FACEBOOK_SECRET, FACEBOOK_CALLBACK_URL } = process.env;

const facebookRouter = express.Router();

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_CLIENT_ID,
  clientSecret: FACEBOOK_SECRET,
  callbackURL: FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email'],
},
  (accessToken, refreshToken, profile, done) => {
    done(null, profile);
  }));

// Authentication via facebook
facebookRouter.get('/', (req, res, next) => {
  const register = req.query.register || false
  passport.authenticate('facebook', {
    scope: 'email',
    state: JSON.stringify({
      register
    }),
  })(req, res, next);
});

facebookRouter.get('/callback', (req, res, next) => {
  passport.authenticate('facebook', {
    failureRedirect: 'https://app.prai.co/',
  })(req, res, next);
},
  async (req, res) => {
    const state = JSON.parse(req.query.state);
    const { email, name, picture } = req.user._json;

    if (state.register) {
      const response = await upsertFacabookRegister(email, name, picture)

      if (response.message) {
        return res.redirect(`https://app.prai.co/facebook?error=${response.message}`);
      }
      
      req.session.user = response;

      res.redirect(`https://app.prai.co/onBoarding?ownerId=${response.id}`);
      
    } else {
      const response = await signInSocialNetwork(email);

      if (response.message) {
        return res.redirect(`https://app.prai.co/facebook?error=${user.message}`);
      }

      req.session.user = response;
      res.redirect('https://app.prai.co/dashboard');
    }
  });

module.exports = {
  facebookRouter,
};
