const flatten = require('lodash.flatten');
const { Op } = require('sequelize');
const unirest = require('unirest');
const { Campaign } = require('../models/campaignModel');
const { ContactList } = require('../models/contactListModel');
const { Contact } = require('../models/contactModel');
const { Pitch } = require('../models/pitchModel');
const { NotFoundError, InvalidRequestError } = require('../utils/errors');
const { parseTextForPreview } = require('../utils/parseTextForPreview');
const { parseText } = require('../utils/parseText');
const {
  createFileWithContent,
  updateFileWithContent,
  deleteFileRecord,
  getFileWithContentById,
} = require('./fileService');
const { GeneratePitch } = require('../models/generatePitchModel');
const { getLastPayment } = require('./paypalService');


const { SERVICE_API_HOST } = process.env;

/**
 * Get pitches with filter and sort 
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getPitches = async (ownerId, page, limit, sort, param, search) => {
  const searchParams = {
    where:
    {
      ownerId,
      pitchText: {
        [Op.ne]: null,
      },
    },
    order: [[sort, param]],
    offset: ((page - 1) * limit),
    limit,
    include: [
      { model: Campaign, attributes: ['title'] },
    ],
    distinct: true,
  };

  if (search) {
    searchParams.where[Op.or] = [
      { pitchTitle: { [Op.iRegexp]: search } },
      { pitchTextPreview: { [Op.iRegexp]: search } },
    ];
  }

  const pitches = await Pitch.findAndCountAll(searchParams);
  if (!pitches.rows) {
    throw new NotFoundError('Pitches not found');
  }
  return pitches;
};

/**
 * Get pitch by id
 * @param {number} ownerId 
 * @param {number} pitchId 
 * @returns 
 */
const getPitchById = async (ownerId, pitchId) => {
  const pitch = await Pitch.findOne({ where: { ownerId, id: pitchId } });
  if (!pitch) {
    throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
  }
  return pitch;
};

const createPitch = async (ownerId) => {
  return await Pitch.create({ ownerId });
};

/**
 * Create own pitch
 * @param {number} ownerId 
 * @param {string} pitchTitle 
 * @param {string} pitchTextPreview 
 * @param {string} content 
 * @param {number} score 
 * @returns 
 */
const createOwnPitch = async (ownerId, pitchTitle, pitchTextPreview, content, score) => {
  const newPitchFile = await createFileWithContent(ownerId, { content });
  const newPitch = await Pitch.create({
    ownerId,
    pitchTitle,
    pitchTextPreview,
    pitchText: newPitchFile.id,
    score: score
  });

  return { Pitch: newPitch, content };
};

/**
 *  Generate pitch title by Python API
 * @param {number} ownerId 
 * @param {string} pitchType 
 * @param {number} pitchId 
 * @returns 
 */
const generatePitchTitle = async (ownerId, pitchType, pitchId) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/title_generation_v2/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  if (pitchType === 'oneForAll') {
    const pitch = await Pitch.findOne({
      where: { ownerId, id: pitchId },
      attributes: ['keyStory', 'keyStoryOriginalId'],
    });

    if (!pitch) {
      throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
    }
    const key = pitch.keyStory ? pitch.keyStory : pitch.keyStoryOriginalId

    const { content: keyStory } = await getFileWithContentById(ownerId, key);

    uni.field('text', parseText(keyStory));
  }

  if (pitchType === 'individual') {
    return 'individual in progress';
  }

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return response;
};

/**
 * Generate pitch by Python API
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @param {string} tonality 
 * @param {number} score 
 * @returns 
 */
const generatePitch = async (ownerId, campaignId, tonality = 'respectful', score) => {
  const campaign = await Campaign.findOne({
    where: { ownerId, id: campaignId },
    include: [
      { model: Pitch },
      {
        model: ContactList,
        attributes: ['id'],
        through: { attributes: [] },
        include: {
          model: Contact,
          attributes: ['id', 'firstName', 'lastName', 'email', 'companyName'],
          through: { attributes: [] },
        },
      },
    ],
  });

  if (!campaign) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }

  if (campaign.campaignType === 'oneForAll') {
    const key = campaign.Pitch.keyStory ? campaign.Pitch.keyStory : campaign.Pitch.keyStoryOriginalId

    const {
      content:
      keyStory,
    } = await getFileWithContentById(ownerId, key);

    const uni = unirest('POST', `${SERVICE_API_HOST}/pitch_generator_v4/`);

    uni.headers({
      'content-type': 'multipart/form-data',
    });

    const keyValue = {
      subject: campaign.campaignDescription ? campaign.campaignDescription : '',
      recipient_name: '',
      recipient_email: '',
      sender_name: campaign.sender ? campaign.sender : '',
      sender_email: campaign.senderEmail ? campaign.senderEmail : '',
      story: keyStory,
      bool_generate_add_text: false,
      tonality,
    };
    uni.field(keyValue);

    const response = await uni.then((res) => {
      if (res.error) throw new Error(res.error);
      return res.body;
    });

    if (response.status == 200) {
      let newPitchFile;
      if (!campaign.Pitch.keyStory) {
        newPitchFile = await createFileWithContent(ownerId, { content: response.text, tonality });
      } 
      // else {
      //   newPitchFile = await updateFileWithContent(
      //     ownerId, campaign.Pitch.keyStory, { content: response.text, tonality },
      //   );
      // }

      await Pitch.update(
        {
          pitchTextPreview: parseTextForPreview(response.text),
          pitchText: newPitchFile ? newPitchFile.id: key,
          keyStory: newPitchFile ? newPitchFile.id: key,
          score: score ? score : campaign.Pitch.score
        },
        { where: { ownerId, id: campaign.Pitch.id } },
      );
      await GeneratePitch.create({
        ownerId,
        text: response.text,
        version5: false,
        campaignId
      })
    }

    return { ...response, keyStory };
  }

  if (campaign.campaignType === 'havePitch') {
    const { content: keyStory } = await getFileWithContentById(ownerId, campaign.Pitch.keyStory);

    const uni = unirest('POST', `${SERVICE_API_HOST} / pitch_generator_v4 / `);

    uni.headers({
      'content-type': 'multipart/form-data',
    });

    const keyValue = {
      subject: campaign.campaignDescription ? campaign.campaignDescription : '',
      recipient_name: '',
      recipient_email: '',
      sender_name: campaign.sender ? campaign.sender : '',
      sender_email: campaign.senderEmail ? campaign.senderEmail : '',
      story_1: keyStory,
      story_2: '',
      bool_generate_add_text: false,
      tonality,
    };

    uni.field(keyValue);

    const response = await uni.then((res) => {
      if (res.error) throw new Error(res.error);
      return res.body;
    });

    if (response.status == 200) {
      let newPitchFile;
      if (!campaign.Pitch.pitchText) {
        newPitchFile = await createFileWithContent(ownerId, { content: response.text, tonality });
      } 
      // else {
      //   newPitchFile = await updateFileWithContent(
      //     ownerId, campaign.Pitch.pitchText, { content: response.text, tonality },
      //   );
      // }

      await Pitch.update(
        {
          pitchText: newPitchFile ? newPitchFile.id: key,
          score: score ? score : campaign.Pitch.score
        },
        { where: { ownerId, id: campaign.Pitch.id } },
      );

      await GeneratePitch.create({
        ownerId,
        text: response.text,
        version5: false,
        campaignId
      })
    }

    return { ...response, keyStory };
  }

  if (campaign.campaignType === 'individual') {
    const {
      content:
      preliminaryStory,
    } = await getFileWithContentById(ownerId, campaign.Pitch.preliminaryStory);
    const {
      content:
      keyStory,
    } = await getFileWithContentById(ownerId, campaign.Pitch.keyStory);
    const contactsToSend = flatten(campaign.ContactLists.map(({ Contacts }) => Contacts));
    if (contactsToSend.length <= 0 || contactsToSend.length > 50) {
      throw new InvalidRequestError(
        `Ubnormal quantity of users.User count: ${contactsToSend.length}, must be from 1 to 50.`, ownerId
      );
    }

    const uni = unirest('POST', `${SERVICE_API_HOST} / pitch_generator_v4 / `);

    uni.headers({
      'content-type': 'multipart/form-data',
    });

    const keyValue = {
      subject: campaign.campaignDescription ? campaign.campaignDescription : '',
      recipient_name: '',
      recipient_email: '',
      sender_name: campaign.sender ? campaign.sender : '',
      sender_email: campaign.senderEmail ? campaign.senderEmail : '',
      story_1: keyStory,
      story_2: preliminaryStory,
      bool_generate_add_text: false,
      tonality,
    };

    uni.field(keyValue);

    // contactsToSend.forEach(async (element) => {
    //   const keyValue = {
    //     subject: campaign.campaignDescription ? campaign.campaignDescription : '',
    //     recipient_name: element.firstName,
    //     recipient_email: element.email,
    //     sender_name: campaign.sender ? campaign.sender : '',
    //     sender_email: campaign.senderEmail ? campaign.senderEmail : '',
    //     story_1: keyStory,
    //     story_2: '',
    //     bool_generate_add_text: false,
    //   };

    //   uni.field(keyValue);

    const response = await uni.then((res) => {
      if (res.error) throw new Error(res.error);
      return res.body;
    });

    if (response.status == 200) {
      await GeneratePitch.create({
        ownerId,
        text: response.text,
        version5: false,
        campaignId
      })
    }

    return response;
  }

  return campaign;
};

/**
 * Generate pitch 5 by Python API
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @param {string} tonality 
 * @param {number} score 
 * @returns 
 */
const generatePitchV5 = async (ownerId, campaignId, tonality = 'respectful', score, textNews) => {
  const campaign = await Campaign.findOne({
    where: { ownerId, id: campaignId },
    include: [
      { model: Pitch }
    ],
  });

  if (!campaign) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }
  const key = campaign.Pitch.keyStory ? campaign.Pitch.keyStory : campaign.Pitch.keyStoryOriginalId

  const {
    content:
    keyStory,
  } = await getFileWithContentById(ownerId, key);

  const uni = unirest('POST', `${SERVICE_API_HOST}/pitch_generator_v5/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  const keyValue = {
    story_1: textNews,
    story_2: keyStory,
    tonality,
  };
  uni.field(keyValue);

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  if (response.status == 200) {

    let newPitchFile;

    if (!key) {
      newPitchFile = await createFileWithContent(ownerId, { content: response.text, tonality });
    } 
    // else {
    //   newPitchFile = await updateFileWithContent(
    //     ownerId, key, { content: response.text, tonality },
    //   );
    // }

    await Pitch.update(
      {
        pitchTextPreview: parseTextForPreview(response.text),
        pitchText: newPitchFile ? newPitchFile.id: key,
        score: score ? score : campaign.Pitch.score
      },
      { where: { ownerId, id: campaign.Pitch.id } },
    );

    await GeneratePitch.create({
      ownerId,
      text: response.text,
      version5: true,
      campaignId,
    })
  }


  return {...response, textNews, keyStory };
};
/**
 * Update pitch by id
 * @param {number} ownerId 
 * @param {number} pitchId 
 * @param {*} body 
 * @returns 
 */
const updatePitch = async (ownerId, pitchId, body) => {
  const pitch = await Pitch.findOne({ where: { ownerId, id: pitchId } });

  if (!pitch) {
    throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
  }
  const score = body?.score;
  

  const tonality = body?.tonality ? body?.tonality : 'respectful';

  const newPitch = {
    pitchTitle: body.pitchTitle,
    [`${body.story}OriginalId`]: body.originalStory,
  };

  if (body.subjects) {
    newPitch.subjects = body.subjects;
  }

  if (body.story === 'pitchText') newPitch.pitchTextPreview = body.recognizedTextPreview;

  if (score) newPitch.score = score

  if (body?.content) {
    const content = await parseText(body?.content);
    if (pitch.keyStory) {
      await updateFileWithContent(ownerId, pitch.keyStory, { ...body, content, tonality });
      newPitch[pitch.story] = pitch.keyStory;

    } else if (body.noteId == -1) {
      // create file with type 'note' 
      const newFile = await createFileWithContent(ownerId, { ...body, content, tonality });

      newPitch[body.story] = newFile.id;

    } else if (body.noteId) {

      await updateFileWithContent(ownerId, body.noteId, { ...body, content, tonality });
      newPitch[body.story] = body.noteId;
    }
    // await pitch.update(newPitch);
    // return pitch;
  }

  if (body.contentNews || body.contentNews == '') {
    newPitch.contentNews = body.contentNews;
  }

  await pitch.update(
    newPitch,
    { where: { ownerId, id: pitchId } },
  );
  return pitch;
};

/**
 * Delete pitch by id
 * @param {number} ownerId 
 * @param {number} pitchId 
 * @returns 
 */
const deletePitch = async (ownerId, pitchId) => {
  const pitch = await Pitch.findOne({ where: { ownerId, id: pitchId } });
  if (!pitch) {
    throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
  }
  if (pitch.preliminaryStory) await deleteFileRecord(ownerId, pitch.preliminaryStory);
  if (pitch.keyStory) await deleteFileRecord(ownerId, pitch.keyStory);
  if (pitch.pitchText) await deleteFileRecord(ownerId, pitch.pitchText);
  await pitch.destroy();
  return pitch;
};

const getCountGenerateSinceLastPayment = async (ownerId) => {
  const { createdAt } = await getLastPayment(ownerId)
  const { count } = await GeneratePitch.findAndCountAll({
    where: {
      ownerId,
      createdAt: {
        [Op.gte]: createdAt
      }
    }
  })
  return count
}

const autoSelection = async (ownerId, pitchId) => {
  const pitch = await Pitch.findOne({
    where: { ownerId, id: pitchId },
    attributes: ['keyStory', 'keyStoryOriginalId'],
  });

  if (!pitch) {
    throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
  }
  const key = pitch.keyStory ? pitch.keyStory : pitch.keyStoryOriginalId

  const { content: keyStory } = await getFileWithContentById(ownerId, key);

  const uni = unirest('POST', `${SERVICE_API_HOST}/contacts/auto_selection`);

  uni.headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' });

  const textP = await parseText(keyStory);

  uni.send({ text: textP });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return response
}

module.exports = {
  getPitches,
  getPitchById,
  createPitch,
  createOwnPitch,
  generatePitchTitle,
  generatePitch,
  updatePitch,
  deletePitch,
  generatePitchV5,
  getCountGenerateSinceLastPayment,
  autoSelection
};
