const { Op } = require('sequelize');
const { sequelize } = require('../databaseConnection');
const { Campaign } = require('../models/campaignModel');
const { ContactList } = require('../models/contactListModel');
const { Contact } = require('../models/contactModel');
const { File } = require('../models/fileModel');
const { Pitch } = require('../models/pitchModel');
const unirest = require('unirest');

const { SERVICE_API_HOST } = process.env

/**
 * Get capmaigns for dashboard
 * @param {number} ownerId 
 * @returns 
 */
const getCampaignsForDashboard = async (ownerId) => {
  const statusCounts = await Campaign.count({
    where: { ownerId },
    attributes: [['status', 'name']],
    group: 'status',
  });

  let countAll = 0;
  const defaultArray = [
    {
      name: "Completed",
      value: 0
    },
    {
      name: "Unfinished",
      value: 0
    },
    {
      name: "Active",
      value: 0
    }
  ];

  const statusArray = statusCounts.map((el) => {
    countAll += +el.count;
    return { name: el.name, value: +el.count };
  });
  const mergedArray = [...defaultArray, ...statusArray];
  const uniqueData = [...mergedArray.reduce((map, obj) => map.set(obj.name, obj), new Map()).values()];

  uniqueData.push({ name: 'All', value: countAll })

  return uniqueData;
};

/**
 *  Get last capmaigns
 * @param {number} ownerId 
 * @param {number} limit 
 * @returns 
 */
const getLastCampaignsForDashboard = async (ownerId, limit) => {
  const response = await Campaign.findAll({
    where: { ownerId },
    attributes: ['id', ['title', 'name'], ['createdAt', 'date'], 'status'],
    limit,
    order: [['createdAt', 'desc']],
  });
  return response;
};

/**
 * Get files for dashboard
 * @param {number} ownerId 
 * @returns 
 */
const getFilesForDashboard = async (ownerId) => {
  const files = await File.count({
    where: { ownerId },
    attributes: [['fileType', 'name']],
    group: 'fileType',
  });

  const pitches = await Pitch.findAll({
    where: { ownerId },
    attributes: [[sequelize.fn('COUNT', sequelize.col('pitchText')), 'pitches']],
  });

  const documents = await File.findAll({
    where: { ownerId },
    attributes: [[sequelize.fn('COUNT', sequelize.col('writingStyle')), 'documents']],
  });

  const outputArray = [];

  files.forEach((element) => {
    if (element.name === 'note') {
      outputArray.push({ name: 'Notes', value: +element.count });
    }
    if (element.name === 'audio') {
      outputArray.push({ name: 'Audio', value: +element.count });
    }
  });

  outputArray.push({ name: 'Pitches', value: +pitches[0].dataValues.pitches });
  outputArray.push({ name: 'Documents', value: +documents[0].dataValues.documents });

  return outputArray;
};

/**
 * Get search for dashboard
 * @param {number} ownerId 
 * @param {string} search 
 * @returns 
 */
const getSearchForDashboard = async (ownerId, search) => {
  const campaigns = await Campaign.findAll({
    where: {
      ownerId,
      [Op.or]: [
        { title: { [Op.iRegexp]: search } },
        { campaignDescription: { [Op.iRegexp]: search } },
      ]
    }
  })

  const opOr = [
    { email: { [Op.iRegexp]: search } },
    { jobRole: { [Op.iRegexp]: search } },
  ]

  const [firstName, lastName] = search.split(' ');

  if (firstName) {
    opOr.push(
      { firstName: { [Op.iRegexp]: firstName } },
      { lastName: { [Op.iRegexp]: firstName } }
    )
    if (lastName) {
      opOr.push(
        { firstName: { [Op.iRegexp]: lastName } },
        { lastName: { [Op.iRegexp]: lastName } }
      )
    }
  }
  const contacts = await Contact.findAll({
    where: {
      ownerId,
      [Op.or]: opOr
    }
  })

  const contactsList = await ContactList.findAll({
    where: {
      ownerId,
      [Op.or]: [
        { title: { [Op.iRegexp]: search } },
        { description: { [Op.iRegexp]: search } },
      ]
    }
  })

  const pitches = await Pitch.findAll({
    where: {
      ownerId,
      [Op.or]: [
        { pitchTitle: { [Op.iRegexp]: search } },
        { pitchTextPreview: { [Op.iRegexp]: search } },
      ]
    }
  })

  const files = await File.findAll({
    where: {
      ownerId,
      [Op.or]: [
        { fileName: { [Op.iRegexp]: search } },
        { description: { [Op.iRegexp]: search } },
        { textTitle: { [Op.iRegexp]: search } },
        { recognizedTextPreview: { [Op.iRegexp]: search } },
      ]
    }
  });

  return {
    campaigns,
    contacts,
    contactsList,
    pitches,
    files
  }
}

const getPitchRating = async (user_id) => {
  const uni = unirest('GET', `${SERVICE_API_HOST}/dashboard/pitch_rating/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "user_id": user_id
  }

  uni.send(fields)

  const response = await uni.then(async (res) => {
    if (res.error) return res.error;

    return res.body;
  });
  return response
}

const getReport = async (user_id) => {
  const uni = unirest('GET', `${SERVICE_API_HOST}/dashboard/report/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "user_id": user_id
  }

  uni.send(fields)

  const response = await uni.then(async (res) => {
    if (res.error) return res.error;

    return res.body;
  });
  return response
}


module.exports = {
  getCampaignsForDashboard,
  getLastCampaignsForDashboard,
  getFilesForDashboard,
  getSearchForDashboard,
  getPitchRating,
  getReport
};
