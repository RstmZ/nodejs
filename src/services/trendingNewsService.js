const unirest = require('unirest'); 
const { getFileWithContentById } = require('./fileService');
const { Pitch } = require('../models/pitchModel');
const { AppError } = require('../utils/errors');
const { parseText } = require('../utils/parseText');
const { News } = require('../models/newsModel');

const { SERVICE_API_HOST } = process.env;

/**
 * Get trending news
 * @param {number} ownerId 
 * @returns 
 */
const getTrendingNews = async (ownerId) => {

  const uni = unirest('GET', `${SERVICE_API_HOST}/trending_news/dashboard/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  uni.send({ 'user_id': ownerId });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  if (response.status == 200) {
    return response
  }

  const news = await News.findAll({
    where: {
      ownerId
    },
    order: [['createdAt', 'DESC']],
  })

  return {
    status: 200,
    news: news
  }
};

/**
 * Get text from link
 * @param {string} newsLink 
 * @returns 
 */
const getTextFromLink = async (newsLink) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/url/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('url', newsLink);

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return { linkContent: response.text_from_url };
};

/**
 * Get pitch intro
 * @param {number} ownerId  
 * @returns 
 */
const getPitchIntro = async (ownerId, pitchId) => {
  // let text = `That leaves Hawaii as the only state with mask requirements that has not yet  announced any plans to relax them. Puerto Rico, the largest U.S. territory, also has yet to announce any changes to its island-wide mandate.
  //             Many red states never had broad mask requirements. Washington State had largely maintained a cautious approach, like other blue states. But in recent days, there has been a quick succession of states governed by Democrats reversing their mask requirements. Many had once been relaxed as vaccines became widely available, only to be reinstated as variants surged across the country.`;

  const pitch = await Pitch.findOne({
    where: {
      ownerId,
      id: pitchId, 
    }
  });
  if (!pitch) {
    return {
      status: 400,
      message: "Not found pitch"
    }
  }
  const key = pitch.keyStory ? pitch.keyStory : pitch.keyStoryOriginalId 

  const { content } = await getFileWithContentById(ownerId, key);
 
  const uni = unirest('POST', `${SERVICE_API_HOST}/trending_news/pitch_intro/`);

  const contentParse = await parseText(content) 

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', contentParse.slice(0, 30000));

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
}

/**
 * Get pitch intro additional info
 * @param {string} link 
 * @returns 
 */
const getPitchIntroAdditionalInfo = async (link) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/trending_news/pitch_intro/get_additional_info/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('link', link);

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
}

const createNews = async (ownerId, campaignId, title, url) => {
  const response = await getPitchIntroAdditionalInfo(url);
  if (response.status != 200) {
    return response
  }
  const resp = response.summary.split(/\.|\?|\!/)
  const news = await News.create({
    ownerId,
    campaignId,
    title,
    url,
    previewContent: resp.length >= 2 ? resp[0] + '.' + resp[1] : resp[0]
  })
  return {
    status: 200,
    news
  }
}

const getAuthor = async (first_name, last_name, company) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/trending_news/author/`);
  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('first_name', first_name);
  uni.field('company', company);
  uni.field('last_name', last_name);

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
}

const getDuration = async (funcName, audioDuration) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/mean_time_duration/`);
  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('func_name', funcName);

  if (audioDuration) {
    uni.field('audio_duration', audioDuration);
  }

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return response
}

module.exports = {
  getTrendingNews,
  getTextFromLink,
  getPitchIntro,
  getPitchIntroAdditionalInfo,
  createNews,
  getAuthor,
  getDuration
};
