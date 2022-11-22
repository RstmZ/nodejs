const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { newsMethodCreateValidator } = require('../middlewares/validationMiddleware');
const { getTrendingNews, getTextFromLink, getPitchIntro, getPitchIntroAdditionalInfo, createNews } = require('../services/trendingNewsService');
const { asyncWrapper } = require('../utils/apiUtils');

const trendingNewsRouter = express.Router();

// Get trending news
trendingNewsRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { status, ...result } = await getTrendingNews(ownerId);
  res.status(status).json(result);
}));

// Get text from link
trendingNewsRouter.get('/link', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { newsLink } = req.query;
  const response = await getTextFromLink(newsLink);
  res.json(response);
}));

// Get pitch intro
trendingNewsRouter.post('/intro', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { pitchId } = req.body;
  const { status, ...result } = await getPitchIntro(ownerId, pitchId);
  res.status(status).json(result);
}));

// Get pitch intro additional info
trendingNewsRouter.post('/introInfo', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { link } = req.body;
  const { status, ...result }  = await getPitchIntroAdditionalInfo(link);
  res.status(status).json(result);
}));

// Create news
trendingNewsRouter.post('/create', userSessionMiddleware, newsMethodCreateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId, title, url } = req.body;
  const { status, ...result } = await createNews(ownerId, campaignId, title, url);
  res.status(status).json(result);
}));

module.exports = {
  trendingNewsRouter,
};
