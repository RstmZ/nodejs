const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const registrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(20).required(),
  name: Joi.string().required(),
});

const registrationSchemaAndPrice = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(20).required(),
  priceId: Joi.string(),
  type: Joi.string(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  organization: Joi.string().allow(''),
  city: Joi.string().allow('')
});

const authSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(20).required(),
});

const resetSchema = Joi.object({
  email: Joi.string().email().required(),
  redirect: Joi.string().required(),
});

const campaignCreateSchema = Joi.object({
  campaignType: Joi.string().valid('havePitch', 'oneForAll', 'individual'),
  title: Joi.string(),
  campaignDescription: Joi.string(),
  sender: Joi.string(),
  senderEmail: Joi.string(),
  picture: Joi.number(),
  step: Joi.number(),
  sheduleTime: Joi.string(),
  boolAltEmailService: Joi.boolean()
});

const campaignUpdateSchema = Joi.object({
  campaignType: Joi.string().valid('havePitch', 'oneForAll', 'individual'),
  title: Joi.string(),
  status: Joi.string().valid('Completed', 'Active', 'Unfinished'),
  campaignDescription: Joi.string(),
  sender: Joi.string(),
  senderEmail: Joi.string(),
  picture: Joi.number(),
  step: Joi.number().required(),
  sheduleTime: Joi.string(),
  nft: Joi.boolean(),
  emailResponseAnalysis: Joi.boolean(),
  boostOpenRate: Joi.boolean(),
  duplicateWhatsApp: Joi.boolean(),
  template: Joi.boolean(),
  shedule: Joi.boolean(),
  useTimeZone: Joi.boolean(),
  videoPitch: Joi.boolean(),
  useTimeZone: Joi.boolean(),
  hour: Joi.number(),
  minute: Joi.number(),
  year: Joi.number(),
  month: Joi.number(),
  day: Joi.number(),
  sendCopy: Joi.boolean(),
  boolAltEmailService: Joi.boolean()
}).min(1);

const addContactListToCampaignSchema = Joi.object({
  contactListId: Joi.array().items(Joi.number()).required(),
});

const userTeamMemberCreateSchema = Joi.object({
  ownerId: Joi.number(),
  email: Joi.string().email().required(),
  status: Joi.string().valid('Admin', 'Moderator').required(),
});

const userTeamMemberUpdateStatusSchema = Joi.object({
  status: Joi.string().valid('admin', 'moderator').required(),
});

const pitchUpdateSchema = Joi.object({
  story: Joi.string().valid('preliminaryStory', 'keyStory', 'pitchText'),
  pitchTitle: Joi.string(),
  originalStory: Joi.number(),
  textTitle: Joi.string(),
  content: Joi.string(),
  score: Joi.number(),
  subjects: Joi.string(),
  contentNews: Joi.string().allow(null, ''),
  noteId: Joi.number().allow(null, '')
});

const messageCreateSchema = Joi.object({
  textTitle: Joi.string().required(),
  content: Joi.string().required(),
});

const paymentMethodCreateSchema = Joi.object({
  methodPayment: Joi.string().valid('PayPal', 'Credit card').required(),
  priceId: Joi.string().required()
});

const messageUpdateSchema = Joi.object({
  description: Joi.string(),
  fileName: Joi.string(),
  textTitle: Joi.string(),
  content: Joi.string(),
});

const contactsGetSchema = Joi.object({
  listId: Joi.array().items(Joi.number()),
  firstName: Joi.array().items(Joi.string()),
  lastName: Joi.array().items(Joi.string()),
  subjects: Joi.array().items(Joi.string()),
  workingLanguages: Joi.array().items(Joi.string()),
  company: Joi.array().items(Joi.string()),
  position: Joi.array().items(Joi.string()),
  city: Joi.array().items(Joi.string()),
  companyType: Joi.array().items(Joi.string()),
  campaignList: Joi.array().items(Joi.string()),
  contactList: Joi.array().items(Joi.string()),
  isPrivate: Joi.string(),
  keyWords: Joi.array().items(Joi.string()),
  tags: Joi.array().items(Joi.string()),
});

const contactCreateSchema = Joi.object({
  avatar: Joi.string().allow(''),
  isActive: Joi.boolean().allow(true),
  isPrivate: Joi.boolean().allow(false),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  companyName: Joi.string().required(),
  companyType: Joi.string().allow(''),
  jobRole: Joi.string().allow(''),
  position: Joi.string().required(),
  email: Joi.string().email().required(),
  twitterUsername: Joi.string().allow(''),
  phoneNumber: Joi.string().allow(''),
  mobilePhoneNumber: Joi.string().allow(''),
  faxNumber: Joi.string().allow(''),
  workingLanguages: Joi.string().allow(''),
  country: Joi.string().required(),
  state: Joi.string().allow(''),
  city: Joi.string().required(),
  address: Joi.string().required(),
  aboutContact: Joi.string().allow(''),
  contactOwnSubjects: Joi.array().items(Joi.string().allow('')),
  subjects: Joi.array().items(Joi.string().allow('')),
  notes: Joi.string().allow(''),
  companyCity: Joi.string().allow(''),
  website: Joi.string().allow(''),
  aboutCompany: Joi.string().allow(''),
  uniqueVisitors: Joi.number().allow(),
  audienceReach: Joi.number().allow(),
  type: Joi.string().valid('Journalist', 'Influencers').allow('')
});

const contactUpdateSchema = Joi.object({
  avatar: Joi.string().allow(''),
  isActive: Joi.boolean().allow(true),
  isPrivate: Joi.boolean().allow(false),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  companyName: Joi.string().required(),
  companyType: Joi.string().allow(''),
  jobRole: Joi.string().allow(''),
  position: Joi.string().required(),
  email: Joi.string().email().required(),
  twitterUsername: Joi.string().allow(''),
  phoneNumber: Joi.string().allow(''),
  mobilePhoneNumber: Joi.string().allow(''),
  faxNumber: Joi.string().allow(''),
  workingLanguages: Joi.string().allow(''),
  country: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().required(),
  aboutContact: Joi.string().allow(''),
  contactOwnSubjects: Joi.array().items(Joi.string().allow('')),
  subjects: Joi.array().items(Joi.string().allow('')),
  notes: Joi.string().allow(''),
});

const contactListCreateSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  contactsId: Joi.array().items(Joi.number()),
});

const contactListUpdateSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  contactsId: Joi.array().items(Joi.number()),
});

const faqCreateSchema = Joi.object({
  type: Joi.string().valid('Dashboard', 'Campaigns', 'Contacts and lists', 'Audio', 'Messages',
    'Pitches', 'Trending news', 'Notification', 'Settings', 'Other').required(),
  message: Joi.string().required(),
});


const notificationCreateSchema = Joi.object({
  type: Joi.string().valid('campaign', 'payment', 'update').required(),
  title: Joi.string().required(),
  text: Joi.string(),
  additionalData: Joi.string(),
  subtitle: Joi.string()
});

const notificationUpdateSchema = Joi.object({
  type: Joi.string().valid('campaign', 'payment', 'update').required(),
  title: Joi.string(),
  text: Joi.string(),
  additionalData: Joi.string(),
  subtitle: Joi.string()
}).min(1);

const createNewsSchema = Joi.object({
  campaignId: Joi.number(),
  title: Joi.string(),
  url: Joi.string(),
});

const getAuthorSchema = Joi.object({
  first_name: Joi.string().required(),
  company: Joi.string().required(),
  last_name: Joi.string().required(),
});

const createAnimateSchema = Joi.object({
  character: Joi.string().required(),
  version: Joi.string().required(),
  voice: Joi.string().required(),
  text: Joi.string().required(),
  campaignId: Joi.string().required(),
});

const templateSchema = Joi.object({
  type: Joi.string().valid('greeting', 'intro', 'cta').required()
});

const variableSchema = Joi.object({
  type: Joi.string().valid('name', 'company', 'city').required()
});

const validatoionMiddleware = (schema, dataParser) => async (req, res, next) => {
  if (typeof dataParser !== 'function') {
    // eslint-disable-next-line
    dataParser = (req) => {
      return req.body;
    };
  }

  try {
    await schema.validateAsync(dataParser(req));
    next();
  } catch (err) {
    next(new ValidationError(err.message));
  }
};

module.exports = {
  registrationValidator: validatoionMiddleware(registrationSchemaAndPrice),
  authValidator: validatoionMiddleware(authSchema),
  resetValidator: validatoionMiddleware(resetSchema),
  campaignCreateValidator: validatoionMiddleware(campaignCreateSchema),
  campaignUpdateValidator: validatoionMiddleware(campaignUpdateSchema),
  addContactListToCampaignValidator: validatoionMiddleware(addContactListToCampaignSchema),
  userTeamMemberCreateValidator: validatoionMiddleware(userTeamMemberCreateSchema),
  userTeamMemberUpdateStatusValidator: validatoionMiddleware(userTeamMemberUpdateStatusSchema),
  pitchUpdateValidator: validatoionMiddleware(pitchUpdateSchema),
  messageCreateValidator: validatoionMiddleware(messageCreateSchema),
  messageUpdateValidator: validatoionMiddleware(messageUpdateSchema),
  contactsGetValidator: validatoionMiddleware(contactsGetSchema),
  contactCreateValidator: validatoionMiddleware(contactCreateSchema),
  contactUpdateValidator: validatoionMiddleware(contactUpdateSchema),
  contactListCreateValidator: validatoionMiddleware(contactListCreateSchema),
  contactListUpdateValidator: validatoionMiddleware(contactListUpdateSchema),
  faqCreateValidator: validatoionMiddleware(faqCreateSchema),
  notificationCreateValidator: validatoionMiddleware(notificationCreateSchema),
  notificationUpdateValidator: validatoionMiddleware(notificationUpdateSchema),
  paymentMethodCreateValidator: validatoionMiddleware(paymentMethodCreateSchema),
  newsMethodCreateValidator: validatoionMiddleware(createNewsSchema),
  getAuthorValidator: validatoionMiddleware(getAuthorSchema),
  createAnimateValidator: validatoionMiddleware(createAnimateSchema),
  templateValidator: validatoionMiddleware(templateSchema),
  variableValidator: validatoionMiddleware(variableSchema),
};
