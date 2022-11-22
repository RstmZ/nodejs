const express = require('express');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { pitchUpdateValidator } = require('../middlewares/validationMiddleware');
const {
  getPitches,
  getPitchById,
  createOwnPitch,
  updatePitch,
  deletePitch,
  generatePitch,
  generatePitchTitle,
  generatePitchV5,
  autoSelection,
} = require('../services/pitchService');
const { asyncWrapper } = require('../utils/apiUtils');
const { parseTextForPreview } = require('../utils/parseTextForPreview');

const pitchRouter = express.Router();

// Get pitches with filter and sort 
pitchRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const {
    page = 1, limit = 10, sort = 'pitchTitle', param = 'asc', search = '',
  } = req.query;
  const ownerId = req.session.user.id;
  const response = await getPitches(ownerId, page, limit, sort, param, search);
  res.json(response);
}));

// Get pitch by id
pitchRouter.get('/:pitchId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { pitchId } = req.params;
  const response = await getPitchById(ownerId, pitchId);
  res.json(response);
}));

// Generate pitch
pitchRouter.post('/generate', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId, tonality, score } = req.body;
  const response = await generatePitch(ownerId, campaignId, tonality, score);
  res.json(response);
}));

// Generate pitch
pitchRouter.post('/generate_v5', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId, tonality, score, textNews } = req.body;
  const response = await generatePitchV5(ownerId, campaignId, tonality, score, textNews);
  res.json(response);
}));

// Create pitch
pitchRouter.post('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { pitchTitle, pitchTextPreview, content, score } = req.body;
  const response = await createOwnPitch(ownerId, pitchTitle, pitchTextPreview, content, score);
  res.json(response);
}));

// Generate pitch title
pitchRouter.post('/generatePitchTitle', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const { pitchType, pitchId } = req.body;
  const response = await generatePitchTitle(ownerId, pitchType, pitchId);
  res.json(response);
}));

// Update pitch by id
pitchRouter.put('/:pitchId', userSessionMiddleware, pitchUpdateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { pitchId } = req.params;
  const response = await updatePitch(ownerId, pitchId, {
    ...req.body,
    recognizedTextPreview: parseTextForPreview(req.body.content),
  });
  res.json(response);
}));

// Delete pitch by id
pitchRouter.delete('/:pitchId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { pitchId } = req.params;
  const response = await deletePitch(ownerId, pitchId);
  res.json(response);
}));

// Delete pitch by ids
pitchRouter.post('/delete/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { ids } = req.body;
  const deleted = await Promise.all(ids.map(async (pitchId) => {
    try {
      const response = await deletePitch(ownerId, pitchId);
      return {
        msg: response,
      };
    } catch (error) {
      return error;
    }
  }));
  res.json(deleted);
}));

pitchRouter.post('/autoselection', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const { pitchId } = req.body; 
  const response = await autoSelection(ownerId, pitchId);
  res.json(response);
}));

module.exports = {
  pitchRouter,
};
