const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  userTeamMemberCreateValidator,
  userTeamMemberUpdateStatusValidator,
} = require('../middlewares/validationMiddleware');
const { EmailsTrial } = require('../models/emailsTrialModel'); 
const { sendInvite } = require('../services/mailService');
const { deleteProfile } = require('../services/profileService');
const stripeService = require('../services/stripeService');
const { getUserByEmail, getUser, getCard, createCard, updateOnBoard, createTestAccount, updateTestAccount, deleteTestAccount } = require('../services/userService');
const {
  getUserTeam,
  inviteUserInTeam,
  inviteUserInTeamCallback,
  createUserTeam,
  getUserTeamByEmail,
  updateMember,
  deleteMember,
} = require('../services/userTeamService');
const { asyncWrapper } = require('../utils/apiUtils');

const memberRouter = express.Router();

memberRouter.post('/member/invite', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id, firstName, email, organization } = req.session.user;
  const { email_recipient } = req.body;

  const userEmail = await getUserByEmail(email_recipient)

  await getUserTeamByEmail(id, email_recipient)

  const { status, ...response } = await sendInvite(email_recipient, firstName, email, organization);

  if (status == 200) {
    await createUserTeam(id, email_recipient, 'Viewer', userEmail.firstName)
  }

  res.status(status).json(response);
}));

// Update member by id
memberRouter.put('/member/:id', userSessionMiddleware, userTeamMemberUpdateStatusValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { id } = req.params;
  const { status } = req.body;
  const update = await updateMember(id, ownerId, status);
  res.json(update);
}));

// Delete member by id
memberRouter.delete('/member/:id', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id: ownerId, email } = req.session.user;
  const { id } = req.params;
  const deleted = await deleteMember(ownerId, id, email);
  res.json(deleted);
}));

// Delete user by id
memberRouter.delete('/:id', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id } = req.params;
 
  const { status } = req.body;

  const user = await getUser(id)

  try {
    if (user.subscriptionId) await stripeService.deleteSubscription(user.subscriptionId)
  } catch (error) { }
  try {
    if (user.customerId) await stripeService.deleteCustomer(user.customerId)
  } catch (error) { }
  try {
    await deleteProfile(id)
  } catch (error) { }

  user.destroy()
  
  if(status) {
    const person = await EmailsTrial.findOne({
      where: {
        email: user.email
      }
    })
    if(person) person.destroy()
  }

  res.json(user);
}));

memberRouter.post('/card/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id } = req.session.user;
  const { card, expDate, cardholdersName } = req.body;
  const response = await createCard(id, card, expDate, cardholdersName)

  res.json(response);
}));

memberRouter.get('/card/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id } = req.session.user;

  const card = await getCard(id)

  res.json({ card });
}));

memberRouter.post('/onboard', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { forService, primary, companySize, role, option } = req.body;
  const { status, ...record } = await updateOnBoard(ownerId, forService, primary, companySize, role, option)

  res.status(status).json(record);
}));

/** Test account  */

memberRouter.post('/account/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { email, isVerification, isLimits, isPay } = req.body;
  const response = await createTestAccount(ownerId, email, isVerification, isLimits, isPay);

  res.json(response);
}));

memberRouter.put('/account/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { email, isVerification, isLimits, isPay } = req.body;
  const response = await updateTestAccount(email, isVerification, isLimits, isPay);

  res.json(response);
}));

memberRouter.delete('/account/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { email } = req.body;
  const response = await deleteTestAccount(email);

  res.json(response);
}));

/** End Test account  */

module.exports = {
  memberRouter,
};
