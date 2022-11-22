const express = require('express');
const { createSignature, checkVerification, getAllDomain } = require('../services/signatureService');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { asyncWrapper } = require('../utils/apiUtils');

const signatureRouter = express.Router();

// Check verification 
signatureRouter.post('/', asyncWrapper(async (req, res) => {
  const { senderEmail } = req.body;
  const newSignature = await checkVerification(senderEmail);

  res.json(newSignature);
}));

// Create signature
signatureRouter.post('/verification', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { senderEmail, sender } = req.body;
  const { status, ...response } = await createSignature(ownerId, senderEmail, sender);

  res.status(status).json(response);
}));

signatureRouter.get('/domains', userSessionMiddleware, asyncWrapper(async (req, res) => {
  await getAllDomain();
  res.json({
    msg: "OK"
  });
}));

module.exports = {
  signatureRouter,
};
