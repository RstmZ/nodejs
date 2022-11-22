const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { createAnimateValidator } = require('../middlewares/validationMiddleware');
const {  createAnimate, getCharacters, getPictureCharacter } = require('../services/animateService');
const { asyncWrapper } = require('../utils/apiUtils');

const animateRouter = express.Router();

animateRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const response = await getCharacters();
    res.json(response);
}));

animateRouter.post('/create', userSessionMiddleware, createAnimateValidator, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id
    const { character, version, voice, text, campaignId } = req.body;
    const response = await createAnimate(ownerId, character, version, text, voice, campaignId);
    res.json(response);
}));

animateRouter.post('/character', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id
    const { character, version } = req.body;
    const response = await getPictureCharacter(character, version);
    res.json(response);
}));

module.exports = {
    animateRouter,
};
