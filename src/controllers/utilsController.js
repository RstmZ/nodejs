const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { asyncWrapper } = require('../utils/apiUtils');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const { getAuthor, getDuration } = require('../services/trendingNewsService');
const { getAuthorValidator } = require('../middlewares/validationMiddleware');

const utilsRouter = express.Router();

utilsRouter.post('/getDuration', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { funcName, audioDuration } = req.body;

  const { status, ...response } = await getDuration(funcName, audioDuration);
  res.status(status).json(response);
}));

utilsRouter.post('/author', userSessionMiddleware, getAuthorValidator, asyncWrapper(async (req, res) => {
  const { first_name, last_name, company } = req.body;

  const { status, ...response } = await getAuthor(first_name, last_name, company);
  res.status(status).json(response);
}));

module.exports = {
  utilsRouter,
};
