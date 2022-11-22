const express = require('express');
const { getStats, getStatsById } = require('../services/statService');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { asyncWrapper } = require('../utils/apiUtils');

const statRouter = express.Router();

// Get statistics
statRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const stats = await getStats();

  res.json(stats);
}));

// Get statistics by id campaign
statRouter.get('/:campaignId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;  
  const stats = await getStatsById(campaignId, ownerId);

  res.json(stats);
}));

module.exports = {
  statRouter,
};
