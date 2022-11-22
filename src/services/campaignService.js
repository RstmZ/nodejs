const { Op } = require('sequelize');
const unirest = require('unirest');
const fs = require('fs');
const { Campaign } = require('../models/campaignModel');
const { CampaignToContactList } = require('../models/campaignToContactListModel');
const { Pitch } = require('../models/pitchModel');
const { NotFoundError, AppError } = require('../utils/errors');
const { deleteFileRecord, getSignedUrl, getImage, getFileWithContentById } = require('./fileService');
const { createPitch, getPitchById } = require('./pitchService');
const { MailingSession } = require('../models/mailingSessionModel');
const { getLastPayment } = require('./paypalService');
const { createErrorMessage } = require('./errorMessageService');
const { sequelize } = require('../databaseConnection'); 
const { getStatsV2 } = require('./statService');
const { ContactListToContact } = require('../models/contactListToContactModel');
const { getContactistById } = require('./contactListService'); 
const mailService = require('./mailService');
const { GeneratePitch } = require('../models/generatePitchModel');


const { SERVICE_API_HOST } = process.env
/**
 * Get campaign with filter and sort
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {number} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getCampaigns = async (ownerId, page, limit, sort, param, search) => {
  const searchParams = {
    where: { ownerId },
    attributes: ['id', 'title', 'status', 'campaignDescription', 'createdAt', 'picture', 'sender', 'senderEmail', 'boolAltEmailService'],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    include: [
      // "CampaignImage",
      // { 
      //   model: File,  
      //   as: "CampaignImage",
      //   attributes: ['key'],
      //   required: false // left join
      // },
    ],
    distinct: true,
  };

  if (search) {
    searchParams.where[Op.or] = [
      { title: { [Op.iRegexp]: search } },
      { campaignDescription: { [Op.iRegexp]: search } },
    ];
  }

  try {
    const { rows, count } = await Campaign.findAndCountAll(searchParams);

    if (!count) {
      throw new NotFoundError('No campaigns found', ownerId)
    }

    const campaigns = await Promise.all(rows.map(async (campaign) => {

      const fields = {
        email: campaign.senderEmail
      }

      const response = await mailService.sendRequest('POST', 'email_info/v2', fields)

      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        campaignDescription: campaign.campaignDescription,
        createdAt: campaign.createdAt,
        picture: campaign.picture,
        sender: campaign.sender,
        campaignImage: campaign.picture ? await getImage(ownerId, campaign.picture) : '',
        statics: await getStatsV2(campaign.id, ownerId),
        verifyEmail: response?.bool_verified || false,
        senderEmail: campaign.senderEmail,
        boolAltEmailService: campaign.boolAltEmailService || false
      }
    }));

    return { count: count, rows: campaigns };
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};
/**
 * get Campaign By Id and by owner Id
 * @param {number} ownerId user id
 * @param {number} campaignId campaign id
 * @returns {Object} object campaign
 */
const getCampaignById = async (ownerId, campaignId) => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId, ownerId },
    attributes: { exclude: ['ownerId'] },
    include: [
      // {
      //   model: CampaignAccess,
      //   attributes: ['status'],
      //   include: [{
      //     model: User,
      //     attributes: ['id', 'email'],
      //   }],
      // },
      // { model: File, attributes: ['key'] },
      // { model: Pitch, as: "Pitch" },
      // { model: ContactList, through: { attributes: [] } }
    ],
  });

  if (!campaign) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }

  return {
    id: campaign.id,
    pitchId: campaign.pitchId,
    campaignType: campaign.campaignType,
    status: campaign.status,
    title: campaign.title,
    campaignDescription: campaign.campaignDescription,
    sender: campaign.sender,
    senderEmail: campaign.senderEmail,
    step: campaign.step,
    sheduleTime: campaign.sheduleTime,
    createdAt: campaign.createdAt,
    nft: campaign.nft,
    arweaveUrl: campaign.arweaveUrl,
    videoUrl: campaign.videoUrl,
    videoPitch: campaign.videoPitch,
    emailResponseAnalysis: campaign.emailResponseAnalysis,
    boostOpenRate: campaign.boostOpenRate,
    duplicateWhatsApp: campaign.duplicateWhatsApp,
    template: campaign.template,
    shedule: campaign.shedule,
    useTimeZone: campaign.useTimeZone,
    hour: campaign.hour,
    minute: campaign.minute,
    year: campaign.year,
    month: campaign.month,
    day: campaign.day,
    campaignImage: campaign.picture ? await getImage(ownerId, campaign.picture) : '',
    sendCopy: campaign.sendCopy,
    // campaignAccesses: campaign.CampaignAccesses.map((access) => ({
    //   status: access.status,
    //   userId: access.User.id,
    //   email: access.User.email,
    // })),
    // pitch: campaign.Pitch,
    pitch: campaign.pitchId ? await getPitchById(ownerId, campaign.pitchId) : null,
    contactListIds: await getContactist(campaign.id),
    type: campaign.type,
    boolAltEmailService: campaign.boolAltEmailService,
    isGeneratePitch: await getIsGeneratePitch(campaign.id)
  };
};

const getIsGeneratePitch = async (campaignId) => {
  const genPitch = await GeneratePitch.findOne({
    where: {
      campaignId
    }
  }) 
  
  return genPitch ? true : false;
}

const getContactist = async (campaignId) => {
  const result = await CampaignToContactList.findAll({
    where: {
      CampaignId: campaignId
    },
    attributes: ["ContactListId"]
  })
  return result.map((contact) => contact.ContactListId)
}

const getContactListByContact = async (ContactId) => {

  const result = await ContactListToContact.findAll({
    where: {
      ContactId: ContactId
    },
  })
  return await Promise.all(result.map(async (contact) => {
    return await getContactistById(contact.ContactListId)
  }))
}

const getCampaignsByContactList = async (ContactListId) => {
  const result = await CampaignToContactList.findAll({
    where: {
      ContactListId: ContactListId
    },
    attributes: ["ContactListId", "CampaignId"]
  })

  const res = await Promise.all(result.map(async (contact) => {
    const campaign = await Campaign.findOne({
      where: { id: contact.CampaignId },
      attributes: ['id', 'title'],
    })
    return campaign
  }))
  return res?.[0]
}

/**
 * create campaign and create pitch
 * @param {number} ownerId  
 * @param {*} body 
 * @returns 
 */
const createCampaign = async (ownerId, body) => {
  const newPitch = await createPitch(ownerId);
  const newCampaign = await Campaign.create({
    ...body, ownerId, pitchId: newPitch.id,
    createdAt: Date.now()
  });
  const result = { ...newCampaign.toJSON() };

  delete result.ownerId;
  return { ...result, pitch: newPitch, status: 200 };
};

/**
 * update campaign by id
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @param {*} body 
 * @returns 
 */
const updateCampaign = async (ownerId, campaignId, body) => {
  const [rowsUpdated, [updatedCampaign]] = await Campaign.update(
    body,
    {
      returning: true,
      where: { id: campaignId, ownerId },
      attributes: { exclude: ['ownerId'] },
    },
  );
  if (!rowsUpdated) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }
  return updatedCampaign;
};

/**
 * Add contact list to campaign by Id
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @param {number[]} contactListId 
 * @returns 
 */
const addContactListToCampaign = async (ownerId, campaignId, contactListId) => {
  try {
    const campaignToUpdate = await Campaign.findOne({ where: { id: campaignId, ownerId } });
    if (!campaignToUpdate) throw new NotFoundError(`No Campaign found with ID: ${campaignId}`, ownerId);

    if (contactListId?.length === 0) {
      await campaignToUpdate.setContactLists([]);
      return campaignToUpdate;
    }
    if (contactListId) {
      await campaignToUpdate.setContactLists(contactListId);
      return campaignToUpdate;
    }
    await createErrorMessage(ownerId, 'No Contact List provided')
    throw new AppError('No Contact List provided');
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

/**
 * delete campaign by Id and CampaignToContactList by campaignId
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @returns 
 */
const deleteCampaign = async (ownerId, campaignId) => {
  const campaign = await Campaign.findOne({ where: { id: campaignId, ownerId } });

  if (!campaign) {
    const message = `Not found campaign with this ID: ${campaignId}`;
    throw new NotFoundError(message, ownerId)
  }
  await CampaignToContactList.destroy({ where: { CampaignId: campaignId } });
  campaign.destroy();
  return 'ok';
};

/**
 * Set image campaign
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @param {number} fileId 
 * @returns 
 */
const setCampaignImage = async (ownerId, campaignId, fileId) => {
  const campaign = await Campaign.findOne({ where: { id: campaignId, ownerId } });
  if (!campaign) {
    await deleteFileRecord(ownerId, fileId);
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }

  if (campaign.picture) {
    await deleteFileRecord(ownerId, campaign.picture);
  }
  await campaign.update({ picture: fileId });

  return { message: 'Picture updated successfully' };
};

const infoBeforeUploading = async (campaignId, ownerId, url, originalname) => {
  const campaign = await Campaign.findOne({ where: { id: campaignId, ownerId } });
  if (!campaign) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }

  const pitch = await Pitch.findOne({
    where: {
      ownerId,
      id: campaign.pitchId,
      keyStory: {
        [Op.ne]: null,
      },
    }
  });
  if (!pitch) {
    return {
      status: 400,
      message: "Not found pitch"
    }
  }

  const { content } = await getFileWithContentById(ownerId, pitch.keyStory);

  const uni = unirest('POST', `${SERVICE_API_HOST}/nft/info_before_uploading/`);

  uni.headers({
    'content-type': 'multipart/form-data;'
  });

  uni.field('url', url)
  uni.attach('file', `${process.cwd()}/${originalname}`)
  uni.field('pitch', content)

  const response = await uni.then(async (res) => {
    if (res.error) {
      return res.error;
    }
    return res.body;
  });

  fs.unlinkSync(`${process.cwd()}/${originalname}`)

  return response
}

const sendToArweave = async (ownerId, campaignId, url, originalname) => {
  const campaign = await Campaign.findOne({ where: { id: campaignId, ownerId } });
  if (!campaign) {
    throw new NotFoundError(`Not found campaign with this ID: ${campaignId}`, ownerId);
  }

  const pitch = await Pitch.findOne({
    where: {
      ownerId,
      id: campaign.pitchId,
      keyStory: {
        [Op.ne]: null,
      },
    }
  });
  if (!pitch) {
    return {
      status: 400,
      message: "Not found pitch"
    }
  }
  const { content } = await getFileWithContentById(ownerId, pitch.keyStory);

  const uni = unirest('POST', `${SERVICE_API_HOST}/nft/send_to_arweave/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('url', url)
  uni.attach('file', `${process.cwd()}/${originalname}`)
  uni.field('pitch', content)

  const response = await uni.then(async (res) => {
    if (res.error) return res.error;

    return res.body;
  });

  if (response.status == 200) {
    const { arweave_url } = response;
    await campaign.update({ arweaveUrl: arweave_url, nft: true });
  }

  fs.unlinkSync(`${process.cwd()}/${originalname}`)

  return response
}


const getCutStaticsCampaignPost = async (ownerId, campaignId) => {
  const session = await MailingSession.findOne({
    where: {
      ownerId,
      campaignId,
      tag: {
        [Op.ne]: null,
      },
    },
    order: [['createdAt', 'DESC']],
  })
  if (!session) {
    throw new NotFoundError(`Not found session`, ownerId);
  }
  const uni = unirest('POST', `${SERVICE_API_HOST}/postmark/get_cut_statistics/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "tracking_id": session.tag,
    "user_id": ownerId
  }

  uni.send(fields)

  const response = await uni.then(async (res) => {
    if (res.error) return res.error;

    return res.body;
  });
  if (response.bool_outdated) {
    return {
      status: 400,
      message: 'The company is outdated'
    }
  }
  return response;
}

const getCutStaticsCampaignGet = async (ownerId, campaignId) => {
  const session = await MailingSession.findOne({
    where: {
      ownerId,
      campaignId,
      tag: {
        [Op.ne]: null,
      },
    },
    order: [['createdAt', 'DESC']],
  })
  if (!session) {
    throw new NotFoundError(`Not found session`, ownerId);
  }

  const uni = unirest('GET', `${SERVICE_API_HOST}/postmark/get_cut_statistics/`);

  uni.headers({
    'Content-Type': 'application/json'
  });

  const fields = {
    "tracking_id": session.tag,
    "user_id": ownerId
  }

  uni.send(fields)

  const response = await uni.then(async (res) => {
    if (res.error) return res.error;

    return res.body;
  });

  return response;
}

const getCountCampaign = async (ownerId, createdAt) => {
  const { count } = await Campaign.findAndCountAll({
    where: {
      ownerId,
      status: "Completed",
      createdAt: {
        [Op.gte]: createdAt
      }
    }
  })
  return count
}

const getCountCampaignSinceLastPayment = async (ownerId) => {
  const { createdAt } = await getLastPayment(ownerId)
  return await getCountCampaign(ownerId, createdAt)
}



module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  deleteCampaign,
  updateCampaign,
  setCampaignImage,
  addContactListToCampaign,
  infoBeforeUploading,
  sendToArweave,
  getCutStaticsCampaignPost,
  getCountCampaign,
  getCountCampaignSinceLastPayment,
  getCutStaticsCampaignGet,
  getContactListByContact,
  getCampaignsByContactList
};
