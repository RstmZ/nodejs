const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  campaignCreateValidator,
  campaignUpdateValidator,
  addContactListToCampaignValidator,
} = require('../middlewares/validationMiddleware');
const {
  getCampaigns,
  getCampaignById,
  createCampaign,
  deleteCampaign,
  updateCampaign,
  addContactListToCampaign,
  infoBeforeUploading,
  sendToArweave,
  getCutStaticsCampaignPost,
  getCutStaticsCampaignGet,
  getCountCampaign,
} = require('../services/campaignService');
const { sendEmails, getReports, influencersReports } = require('../services/mailService');
const { getCountContactsFromCampaign } = require('../services/contactService');
const { asyncWrapper } = require('../utils/apiUtils');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const multer = require('multer');
const { getProfile } = require('../services/profileService');

const stripeService = require('../services/stripeService');

const { getPaymentLimit, getPaymentLimitByOwnerId } = require('../services/paymentService');
const { testAccountIsLimits } = require('../services/userService');

const campaignRouter = express.Router();

const upload = multer({ dest: 'uploads' }).single('file');


// Get campaign with filter and sort
campaignRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const {
    page = 1, limit = 8, sort = 'title', param = 'asc', search = '',
  } = req.query;
  const campaigns = await getCampaigns(ownerId, page, limit, sort, param, search);
  res.json(campaigns);
}));

campaignRouter.get('/reports/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const reports = await getReports();
  res.json(reports);
}));

// get Campaign By Id
campaignRouter.get('/:campaignId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const { campaignId } = req.params;
  const campaign = await getCampaignById(ownerId, campaignId);
  res.json(campaign);
}));

// delete campaigns by ids
campaignRouter.post('/delete/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { ids } = req.body;
  const deleted = await Promise.all(ids.map(async (campaignId) => {
    try {
      const msg = await deleteCampaign(ownerId, campaignId);
      return {
        msg,
      };
    } catch (error) {
      return error;
    }
  }));
  res.json(deleted);
}));

// create campaign
campaignRouter.post('/', userSessionMiddleware, campaignCreateValidator, asyncWrapper(async (req, res) => {
  const { id: ownerId, email } = req.session.user;

  if (!await testAccountIsLimits(email)) {
    const sub = await stripeService.getByUserIdSubscription(ownerId)
    const payments = await stripeService.getLastInfoPayment(ownerId, sub?.items?.data[0]?.price?.id)

    const { currentCampaigns } = await getPaymentLimit(payments?.paymentId)
    const { countCampaigns } = await getProfile(ownerId)

    if (currentCampaigns >= countCampaigns) {
      return res.status(400).json({ message: "Campaigns limits exceeded. Please update the limits in settings." });
    }
  }

  const { status, ...result } = await createCampaign(ownerId, req.body);
  res.status(status).json(result);
}));

// update campaign by id
campaignRouter.put('/:campaignId', userSessionMiddleware, campaignUpdateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;
  const updatedCampaign = await updateCampaign(ownerId, campaignId, req.body);
  res.json(updatedCampaign);
}));

// TODO: Validate
// Add contact list to campaign by Id
campaignRouter.post('/:campaignId', userSessionMiddleware, addContactListToCampaignValidator, asyncWrapper(async (req, res) => {
  const { campaignId } = req.params;
  const ownerId = req.session.user.id;
  const { contactListId } = req.body;
  const newCampaign = await addContactListToCampaign(ownerId, campaignId, contactListId);
  res.json(newCampaign);
}));

// delete campaign by Id and owner id
campaignRouter.delete('/:campaignId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;
  const deleted = await deleteCampaign(ownerId, campaignId);
  res.json(deleted);
}));

// Send content from the pitch to campaigns contacts
campaignRouter.get('/:campaignId/sendEmails', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id: ownerId, email } = req.session.user;
  const { campaignId } = req.params;
  let paymentLastId = null;

  if (!await testAccountIsLimits(email)) {
    const { type, countEmails } = await getProfile(ownerId)
    if (type == "Trial") {

      const { currentEmails } = await getPaymentLimitByOwnerId(ownerId)

      if (currentEmails >= countEmails) {
        return res.status(400).json({ message: "E-mail limits exceeded. Please update the limits in settings." });
      }

    } else {
      const sub = await stripeService.getByUserIdSubscription(ownerId)
      const { paymentId } = await stripeService.getLastInfoPayment(ownerId, sub?.items?.data[0]?.price?.id)

      const { currentEmails } = await getPaymentLimit(paymentId)
      const { countEmails } = await getProfile(ownerId)

      paymentLastId = paymentId

      if (currentEmails >= countEmails) {
        return res.status(400).json({ message: "E-mail limits exceeded. Please update the limits in settings." });
      }
    }
  }

  const { status, ...response } = await sendEmails(ownerId, campaignId, paymentLastId);

  res.status(status).json(response);
}));

// get count contacts from Campaign 
campaignRouter.get('/:campaignId/recipients', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { campaignId } = req.params;
  const ownerId = req.invitationUserId;
  const response = await getCountContactsFromCampaign(ownerId, campaignId);
  res.json(response);
}));

// get report subjects
campaignRouter.get('/:campaignId/influencers', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;

  const response = await influencersReports(ownerId, campaignId);

  res.json(response);
}));

campaignRouter.post('/:campaignId/infoBeforeUploading', upload, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const { campaignId } = req.params;
  const { url } = req.body;
  const fileJson = req.file;

  if (!fileJson) {
    return res.status(400).json({
      code: 2000
    })
  }
  const { status, ...result } = await infoBeforeUploading(campaignId, ownerId, url, fileJson.path);

  res.status(status).json(result)
}));

campaignRouter.post('/:campaignId/sendToArweave', upload, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;
  const { url } = req.body;
  const fileJson = req.file;

  if (!fileJson) {
    return res.status(400).json({
      code: 2000
    })
  }
  const { status, ...result } = await sendToArweave(ownerId, campaignId, url, fileJson.path);

  res.status(status).json(result)
}));

campaignRouter.post('/:campaignId/cut_statics', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;

  const { status, ...result } = await getCutStaticsCampaignPost(ownerId, campaignId);

  res.status(status).json(result)
}));

campaignRouter.get('/:campaignId/cut_statics', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { campaignId } = req.params;

  const { status, ...result } = await getCutStaticsCampaignGet(ownerId, campaignId);

  res.status(status).json(result)
}));

module.exports = {
  campaignRouter,
};
