const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { getCampaignsForDashboard, getLastCampaignsForDashboard, getFilesForDashboard, getSearchForDashboard, getPitchRating, getReport } = require('../services/dashboardService');
const { asyncWrapper } = require('../utils/apiUtils');

const dashboardRouter = express.Router();

// Get campaigns
dashboardRouter.get('/campaigns', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const response = await getCampaignsForDashboard(ownerId);
  res.json(response);
}));

// Get last capmaigns for dashboard
dashboardRouter.get('/lastCampaigns', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { limit } = req.query;
  const response = await getLastCampaignsForDashboard(ownerId, limit);
  res.json(response);
}));

// Get files for dashboard
dashboardRouter.get('/files', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const response = await getFilesForDashboard(ownerId);
  res.json(response);
}));

dashboardRouter.get('/search', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { search } = req.query;

  const response = await getSearchForDashboard(ownerId, search)

  res.json(response);
}));

dashboardRouter.get('/rating', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const { status, ...response } = await getPitchRating(ownerId)

  res.status(status).json(response);
}));

dashboardRouter.get('/report', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const { status, ...response } = await getReport(ownerId)

  res.status(status).json(response);
}));

module.exports = {
  dashboardRouter,
};
