const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { templateValidator, variableValidator } = require('../middlewares/validationMiddleware');
const {
  getSummary, getAnalytics, getParaphrase, getAutotext, getCheckedText, getWordCloud, getPitchVariable, getPitchTemplate,
} = require('../services/textService');
const { asyncWrapper } = require('../utils/apiUtils');

const textRouter = express.Router();

// Get summary
textRouter.post('/summary', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text, typeSummary } = req.body;
  const summary = await getSummary(text, typeSummary);
  res.json(summary);
}));

// Get analytics
textRouter.post('/analytics', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const analytics = await getAnalytics(text);
  res.json(analytics);
}));

// Get paraphrase
textRouter.post('/paraphrase', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const paraphrase = await getParaphrase(text);
  res.json(paraphrase);
}));

// Get autotext
textRouter.post('/autotext', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const autotext = await getAutotext(text);
  res.json(autotext);
}));

// Get checktext
textRouter.post('/checktext', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const checktext = await getCheckedText(text);
  res.json(checktext);
}));

// Get wordcloud
textRouter.post('/wordcloud', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const buffer = await getWordCloud(text);
  res.send(buffer);
}));

textRouter.post('/variable', variableValidator, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { type } = req.body;
  const { status, ...response } = await getPitchVariable(type);
  res.status(status).json(response);
}));

textRouter.post('/template', templateValidator, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { type } = req.body;
  const { status, ...response } = await getPitchTemplate(type);
  res.status(status).json(response);
}));

module.exports = {
  textRouter,
};
