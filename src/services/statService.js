const unirest = require('unirest');
const { MailingSession } = require('../models/mailingSessionModel');
const { Op } = require('sequelize');

const { SERVICE_API_HOST } = process.env;

/**
 * Get statistics by Postmark Api
 * @returns 
 */
const getStats = async () => {
  const uni = unirest('GET', 'https://api.postmarkapp.com/stats/outbound');

  uni.headers({
    Accept: 'application/json',
    'X-Postmark-Server-Token': process.env.POSTMARK_API_TOKEN,
  });

  const response = await uni.then((res) => res.body);

  return response;
};

/**
 * Get statistics by id campaign
 * @param {number} campaignId 
 * @param {number} ownerId 
 * @returns 
 */
const getStatsById = async (campaignId, ownerId) => {
  const mailingSession = await MailingSession.findOne({
    where: {
      ownerId,
      campaignId,
      tag: {
        [Op.ne]: null,
      },
    },
    order: [['createdAt', 'DESC']]
  });
  if (!mailingSession) {
    return {
      msg: 'There are no statistics in this campaign.'
    };
  }

  const response = await get_statistics(mailingSession.tag, ownerId)
  return response;
};

/**
 * Get statistics by tracking by Postmark Api 
 * @param {string} tracking_id 
 * @returns 
 */
const get_statistics = async (tracking_id, ownerId) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/postmark/get_statistics/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "tracking_id": tracking_id,
    "user_id": ownerId
  }

  uni.send(fields)

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return response
}

const getStatsV2 = async (campaignId, ownerId) => {
  const mailingSession = await MailingSession.findOne({
    where: {
      ownerId,
      campaignId,
      tag: {
        [Op.ne]: null,
      },
    },
    order: [['createdAt', 'DESC']]
  });
  if (!mailingSession) {
    return {};
  }

  const uni = unirest('GET', `${SERVICE_API_HOST}/postmark/get_cut_statistics/v2/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "list_tracking_id": [mailingSession.tag],
    "user_id": ownerId
  }

  uni.send(fields)

  const { status, ...response } = await uni.then((res) => {
    if (res.error) res.error;
    return res.body;
  });

  return response
}

module.exports = {
  getStats,
  getStatsById,
  getStatsV2
};
