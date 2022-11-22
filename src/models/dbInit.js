const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('../databaseConnection');

const { Contact } = require('./contactModel');
const { ContactList } = require('./contactListModel');
const { Subject } = require('./subjectModel');
const { Campaign } = require('./campaignModel');
const { File } = require('./fileModel');
const { Pitch } = require('./pitchModel');
const { User } = require('./userModel');
const { ResetToken } = require('./resetTokenModel');
const { UserTeamMember } = require('./userTeamMemberModel');
const { CampaignAccess } = require('./campaignAccessModel');
const { ContactListToContact } = require('./contactListToContactModel');
const { ContactToSubjects } = require('./contactToSubjectsModel');
const { CampaignToContactList } = require('./campaignToContactListModel');
const { Notification } = require('./notificationModel');
const { ContactNote } = require('./contactNoteModel');
const { ContactStatus } = require('./contactStatusModel');
const { IndividualPitch } = require('./individualPitchModel');
const { MailingSession } = require('./mailingSessionModel');
const { MailingSessionResult } = require('./mailingSessionResultModel');
const { InvitationToken } = require('./invitationTokenModel');
const { Profile } = require('./profileModel');
const { BalanceHistory } = require('./historyBalanceModel');
const { PaymentInfo } = require('./paymentInfoModel');
const { PaymentResult } = require('./paymentResultModel');
const { News } = require('./newsModel');
const { GeneratePitch } = require('./generatePitchModel');
const { SessionUser } = require('./sessionUserModel');
const { ErrorMessage } = require('./errorModel');
const { PaymentLimit } = require('./paymentLimitCheckModel');
const { PaymentCard } = require('./userPaymentCardModel');
const { OnBoard } = require('./onboardModel');
const { PromoCode } = require('./promoCodeModel');
const { VerifyEmail } = require('./verifyEmailModel');
const { EmailsTrial } = require('./emailsTrialModel');
const { TestAccount } = require('./testAccountModel');
const { UsePromoCode } = require('./usePromoCodeModel');

const myStore = new SequelizeStore({
  db: sequelize,
});
(async () => {
  await myStore.sync();
  await User.sync({ alter: true });
  await Contact.sync({alter: true});
  await ContactList.sync({ alter: true });
  await Subject.sync();
  await Campaign.sync({ alter: true });
  await File.sync();
  await Pitch.sync({ alter: true });
  await ResetToken.sync({ alter: true });
  await UserTeamMember.sync({ alter: true });
  await CampaignAccess.sync();
  await ContactListToContact.sync();
  await ContactToSubjects.sync({ alter: true });
  await CampaignToContactList.sync();
  await ContactNote.sync();
  await ContactStatus.sync({ alter: true });
  await Notification.sync();
  await IndividualPitch.sync();
  await InvitationToken.sync({ alter: true });
  await MailingSession.sync({ alter: true });
  await MailingSessionResult.sync({ alter: true });
  await Profile.sync({ alter: true });
  await BalanceHistory.sync();
  await PaymentInfo.sync({ alter: true });
  await PaymentResult.sync({ alter: true });
  await News.sync({ alter: true });
  await SessionUser.sync({ alter: true });
  await GeneratePitch.sync({ alter: true });
  await ErrorMessage.sync({ alter: true });
  await PaymentLimit.sync({ alter: true });
  await PaymentCard.sync({ alter: true });
  await OnBoard.sync({ alter: true });
  await PromoCode.sync({ alter: true });
  await VerifyEmail.sync({ alter: true });
  await EmailsTrial.sync({})
  await TestAccount.sync({})
  await UsePromoCode.sync({})

  User.hasOne(ResetToken, { foreignKey: { unique: true } });

  // User.hasMany(UserTeamMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
  // UserTeamMember.belongsTo(User, { foreignKey: 'userInTeamId' });

  Pitch.hasMany(Campaign, { sourceKey: 'id', foreignKey: 'pitchId' });
  Campaign.belongsTo(Pitch, { foreignKey: 'pitchId' });

  File.hasMany(Pitch, { as: 'PreliminaryStory', foreignKey: 'preliminaryStoryOriginalId' });

  File.hasMany(Pitch, { as: 'KeyStory', foreignKey: 'keyStoryOriginalId' });

  // File.hasMany(Pitch, { as: 'PitchText', foreignKey: 'pitchText' });
  Pitch.hasOne(File, { as: 'PitchText', sourceKey: 'pitchText', foreignKey: 'id' });

  Campaign.hasOne(File, {
    as: 'CampaignImage', sourceKey: 'picture', foreignKey: 'id', onDelete: 'CASCADE',
  });

  // File.hasOne(Campaign, {
  //   as: 'CampaignImage', foreignKey: 'picture', onDelete: 'CASCADE',
  // });
  // Campaign.belongsTo(File, { 
  //   foreignKey: 'picture', as: "CampaignImage", 
  // })

  Campaign.belongsTo(User, { foreignKey: 'ownerId' });
  User.hasMany(Campaign, { foreignKey: 'ownerId', onDelete: 'CASCADE' });

  CampaignAccess.belongsTo(Campaign, { foreignKey: 'campaignId' });
  Campaign.hasMany(CampaignAccess, { foreignKey: 'campaignId', onDelete: 'CASCADE' });

  CampaignAccess.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(CampaignAccess, { foreignKey: 'userId', onDelete: 'CASCADE' });

  Campaign.belongsToMany(ContactList, { through: CampaignToContactList });
  ContactList.belongsToMany(Campaign, { through: CampaignToContactList });

  Campaign.belongsToMany(ContactList, { as: 'CampaignToContactListFilter', through: CampaignToContactList, onDelete: 'CASCADE' });
  ContactList.belongsToMany(Campaign, { as: 'CampaignToContactListFilter', through: CampaignToContactList, onDelete: 'CASCADE' });

  Contact.belongsToMany(Subject, { through: ContactToSubjects, foreignKey: 'сontactId', onDelete: 'CASCADE' });
  Subject.belongsToMany(Contact, { through: ContactToSubjects, foreignKey: 'сontactId', onDelete: 'CASCADE' });

  Contact.belongsToMany(Subject, { as: 'SubjectFilter', through: ContactToSubjects });
  Subject.belongsToMany(Contact, { as: 'SubjectFilter', through: ContactToSubjects });

  Contact.belongsToMany(ContactList, { through: ContactListToContact, onDelete: 'CASCADE' });
  ContactList.belongsToMany(Contact, { through: ContactListToContact, onDelete: 'CASCADE' });

  Contact.belongsToMany(ContactList, { as: 'ContactListFilter', through: ContactListToContact, onDelete: 'CASCADE' });
  ContactList.belongsToMany(Contact, { as: 'ContactListFilter', through: ContactListToContact, onDelete: 'CASCADE' });

  Contact.hasOne(ContactNote, { foreignKey: 'contactId', onDelete: 'CASCADE' });

  Contact.hasOne(ContactStatus, { foreignKey: 'contactId', onDelete: 'CASCADE' });
  Contact.hasOne(ContactStatus, { foreignKey: 'contactId', onDelete: 'CASCADE' });

  User.hasMany(MailingSession, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  MailingSession.belongsTo(User, { foreignKey: 'ownerId' });

  User.hasMany(Profile, { foreignKey: 'ownerId', onDelete: 'CASCADE' });
  Profile.belongsTo(User, { foreignKey: 'ownerId' });

  MailingSession.hasMany(MailingSessionResult, { foreignKey: 'mailingSessionId', onDelete: 'CASCADE' });
  MailingSessionResult.belongsTo(MailingSession, { foreignKey: 'mailingSessionId' });
})();

module.exports = { myStore };
