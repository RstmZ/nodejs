const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  recognizeFunction, recognizeAudioCallback, recognizeLink, checkRecognizeAudioStatus, chatBot,
} = require('../services/recognizeService');
const { asyncWrapper } = require('../utils/apiUtils');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');

const recognizeRouter = express.Router();

recognizeRouter.post('/callback', async (req, res) => {
  await recognizeAudioCallback(req.body.job.id);
  res.status(200).json({ message: 'OK' });
});

recognizeRouter.post('/chatBot', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { query } = req.body; 
  const response = await chatBot(query)
  res.json(response)
}));

// Recognize link 
recognizeRouter.post('/link', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const response = await recognizeLink(ownerId, req.body);
  res.json(response);
}));

// Recognize file by id
recognizeRouter.post('/:fileId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { fileId } = req.params;
  const ownerId = req.invitationUserId;
  const { pitchId, story } = req.body;
  const response = await recognizeFunction(ownerId, fileId, pitchId, story);
  res.json(response);
}));

// Check recorgnize audio by id
recognizeRouter.post('/audioStatus/:fileId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { fileId } = req.params;
  const ownerId = req.session.user.id;

  const response = await checkRecognizeAudioStatus(ownerId, fileId);
  res.json(response);
}));
 
 


module.exports = {
  recognizeRouter,
};
