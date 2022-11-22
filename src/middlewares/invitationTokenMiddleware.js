const { Campaign } = require('../models/campaignModel');
const { InvitationToken } = require('../models/invitationTokenModel');
const { ResetToken } = require('../models/resetTokenModel');
const { userSessionMiddleware } = require('./userSessionMiddleware');

exports.invitationTokenMiddleware = async (req, res, next) => {
  const { invitationToken, campagnId, token } = req.query;
  if (invitationToken) {
    const invitation = await InvitationToken.findOne({ where: { token: invitationToken } });
    if (invitation) {
      req.invitationUserId = invitation.userId;
      next();
      return;
    }
    res.status(401).json({ message: 'Invalid invitation token' });
    return;
  }
 
  if (campagnId) { 
    const campaign = await Campaign.findOne({
      where: {
        id: campagnId
      }
    })  
    if (campaign) {
      req.invitationUserId = campaign.ownerId;
      next();
      return;
    }
    res.status(401).json({ message: 'Not found campaign ' + campagnId });
    return;
  }
  if(token){
    const resetToken = await ResetToken.findOne({ where: { token: token } });
    if (resetToken) {
      req.invitationUserId = resetToken.UserId;
      next();
      return;
    }
    res.status(401).json({ message: 'Invalid invitation token' });
    return;
  }
  userSessionMiddleware(req, res, () => {
    req.invitationUserId = req.session.user.id;
    next();
  });
};
