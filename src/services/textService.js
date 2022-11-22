const unirest = require('unirest');
const fs = require('fs');
const path = require('path');
const request = require('request');
const { StringDecoder } = require('string_decoder');
const { AppError } = require('../utils/errors');

const { SERVICE_API_HOST } = process.env;

/**
 * Get summary 
 * @param {string} text 
 * @param {string} typeSummary 
 * @returns 
 */
const getSummary = async (text, typeSummary) => {
  // summarization 
  const uni = unirest('POST', `${SERVICE_API_HOST}/summarization_for_article/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', text);
  uni.field('type_summary', typeSummary || 'default');

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

/**
 * Get analytics
 * @param {string} text 
 * @returns 
 */
const getAnalytics = async (text) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/analytics/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', text);

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

/**
 * Get paraphrase
 * @param {string} text 
 * @returns 
 */
const getParaphrase = async (text) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/rewriting/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', text);

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

/**
 * Get autotext
 * @param {string} text 
 * @returns 
 */
const getAutotext = async (text) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/autotext/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', text);

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

/**
 * Get check text
 * @param {string} text 
 * @returns 
 */
const getCheckedText = async (text) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/check_text/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', text);

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

/**
 * Get word cloud 
 * @param {string} text 
 * @returns 
 */
const getWordCloud = async (text) => {
  const getUrl = `${SERVICE_API_HOST}/analytics/word_cloud/`;
  const download = async (url, path, callback) => {
    return await request.post(url).auth('prai', 'praiapp', true)
      .form({ text: text })
      .pipe(fs.createWriteStream(path))
      .on('close', callback);  
  }; 
  const pathFile = './1.png';

  var p1 = new Promise(async (resolve, reject) => {
    await download(getUrl, pathFile, ()=>{
      console.log('done ');
      resolve('ok')
    })  
  }); 
  await Promise.all([p1])
  const filePath = path.resolve("./") + '/1.png'
  const bitmap = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);
  return Buffer(bitmap).toString('base64')
};

/**
 * Get pitch variable
 * @param {string} type 
 * @returns 
 */
 const getPitchVariable = async (type) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/pitch/variable/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('type_variable', type);
 
  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};
 
/**
 * Get pitch template
 * @param {string} type 
 * @returns 
 */
 const getPitchTemplate = async (type) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/pitch/template/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('type_template', type);
 
  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return res.body;
  });

  return response;
};

module.exports = {
  getSummary,
  getAnalytics,
  getParaphrase,
  getAutotext,
  getCheckedText,
  getWordCloud,
  getPitchVariable,
  getPitchTemplate
};
