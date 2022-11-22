const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { upsertGoogleRegister, signInSocialNetwork } = require('../services/authService');
const { createProfile } = require('../services/profileService');

const googleRouter = express.Router();

const {
  GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_CALLBACK_URL,
} = process.env;

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL,
  passReqToCallback: true,
},
  (request, accessToken, refreshToken, profile, done) => {
    done(null, profile);
  }));

// Authentication via google
googleRouter.get('/', (req, res, next) => {
  const register = req.query.register || false

  const trial = req.query.trial || false

  passport.authenticate('google', {
    scope:
      ['email', 'profile'],
    state: JSON.stringify({
      register,
      trial
    }),
    // session: true
  })(req, res, next);
});

googleRouter.get('/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: 'https://app.prai.co/',
  })(req, res, next);
},
  async (req, res) => {
    const state = JSON.parse(req.query.state);
    const { email, name, picture } = req.user._json;

    if (state.register) {
      const response = await upsertGoogleRegister(email, name, picture)

      if (response.message) {
        return res.redirect(`https://app.prai.co/google?error=${response.message}`);
      }

      req.session.user = response;

      if(state.trial) {
        const profile = await createProfile(response.id, 'Trial')
        
        await response.update({ isTrial: true, success: true, profileId: profile.id })

        return res.redirect(`https://app.prai.co/dashboard`);

      }
      res.redirect(`https://app.prai.co/onBoarding?ownerId=${response.id}`);

    } else {
      const response = await signInSocialNetwork(email);
      if (response.message) {
        return res.redirect(`https://app.prai.co/google?error=${response.message}`);
      }

      req.session.user = response;
      res.redirect('https://app.prai.co/dashboard');
    }

  });

module.exports = {
  googleRouter,
};
