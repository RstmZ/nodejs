const express = require('express');
const unirest = require('unirest');
const { asyncWrapper } = require('../utils/apiUtils');
const { InvalidRequestError } = require('../utils/errors');

const recaptchaRouter = express.Router();

recaptchaRouter.post('/', asyncWrapper(async (req, res) => {
  const secretKey = process.env.SECRET_RECAPTCHA_KEY;
  const { token } = req.body;

  if (!token) {
    throw new InvalidRequestError();
  }

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
  const uni = unirest('POST', url);

  await uni
    .then((googleResponse) => res.json({ googleResponse }))
    .catch((error) => res.json({ error }));
}));

module.exports = {
  recaptchaRouter,
};
