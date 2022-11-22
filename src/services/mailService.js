const postmark = require('postmark');
const bcrypt = require('bcrypt');
const unirest = require('unirest');
const { getCampaignById, updateCampaign } = require('./campaignService');
const { getPitchById } = require('./pitchService');
const { getMessageWithContentById } = require('./fileService');
const { getContactsFromCampaign } = require('./contactService');
const { MailingSession } = require('../models/mailingSessionModel');
const { MailingSessionResult } = require('../models/mailingSessionResultModel');
const { BusinessRequest } = require('../models/businessRequestModel');
const { Subject } = require('../models/subjectModel');
const { ContactToSubjects } = require('../models/contactToSubjectsModel');
const { User } = require('../models/userModel');
const { Op } = require('sequelize');
const { getLastPayment } = require('./paypalService');
const { InvalidRequestError } = require('../utils/errors');
const { parseText } = require('../utils/parseText');
const { getProfile } = require('./profileService');
const { updateCurrentCamapaign, updateCurrentEmails, updateCurrentCamapaignByOwnerId, updateCurrentEmailsByOwnerId } = require('./paymentService');

const { SERVICE_API_HOST, URL_INVITE, FROM_EMAIL } = process.env;

const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

const sendRecoverSuccessEmail = async (user) => {
  const mailOptions = {
    From: process.env.FROM_EMAIL,
    To: user.email,
    Subject: 'Your password has been changed',
    HtmlBody: `<p>Hi, ${user.name}</p>
    <p>This is a confirmation that the password for your account ${user.email} has just been changed.</p>`,
    TextBody: `Hi, ${user.name}! This is a confirmation that the password for your account ${user.email} has just been changed.`,
    MessageStream: 'broadcast',
  };
  try {
    await postmarkClient.sendEmail(mailOptions);
  } catch (error) {
    throw new InvalidRequestError('Postmark: error send recover success email', user.id)
  }
};

const sendVerifyCode = async (to_email, code) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/sending_verify_code/`);

  uni.headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' });

  const fields = {
    from_email: FROM_EMAIL,
    to_email,
    body: code
  }

  uni.send(fields);

  const response = await uni.then((res) => {
    if (res.error) return res.error;
    return res.body;
  });

  return response
}

/**
 * Send user team by invite email
 * @param {*} user 
 * @param {*} invite 
 * @param {*} inviteLink 
 */
const sendUserTeamInviteEmail = async (user, invite, inviteLink) => {
  const mailOptions = {
    From: process.env.FROM_EMAIL,
    To: invite.email,
    Subject: 'You was invited in team on Prai.co',
    HtmlBody: `<p>Hi, ${invite.name || invite.email}</p>
    <p>${user.name || user.email} invited you to join his team.</p>
    <p>Please click on the following <a href=${inviteLink}>link</a> to join the team.</p>
    <button style="width:200px;height:50px;margin:auto"><a style="text-decoration:none;" href=${inviteLink}>Join</a></button>`,
    TextBody: `Hi, ${invite.name || invite.email}!
    Please click on the following link: ${inviteLink} to join the team.`,
    MessageStream: 'broadcast',
  };
  try {
    await postmarkClient.sendEmail(mailOptions);
  } catch (error) {
    throw new InvalidRequestError('Postmark: error send user team invite email', user.id)
  }
};

const BATCH_SIZE = 500;

const sendEmailsToRecipientsLimited = async (contacts) => {
  const emails = contacts.map((contact) => ({
    // From: process.env.FROM_EMAIL,
    From: contact.From,
    To: contact.To,
    Subject: contact.Subject,
    HtmlBody: contact.HtmlBody,
    TextBody: contact.TextBody,
    Tag: contact.Tag,
    MessageStream: 'broadcast',
  }));

  return postmarkClient.sendEmailBatch(emails);
};

const sendEmailsToRecipients = async (contacts, recordInformation) => {
  const results = [];
  let i = 0;
  while (i < contacts.length) {
    // eslint-disable-next-line no-await-in-loop
    results.push(...(await sendEmailsToRecipientsLimited(contacts.slice(i, BATCH_SIZE + i))));
    i += BATCH_SIZE;
  }

  const record = await MailingSession.create({
    ownerId: recordInformation.ownerId,
    title: recordInformation.title,
    contentId: recordInformation.contentId,
    campaignId: recordInformation.campaignId,
    tag: recordInformation.tag,
  });

  results.forEach(async (result, index) => {
    const mailingResult = await MailingSessionResult.create({
      mailingSessionId: record.id,
      contactId: contacts[index].contactId,
      successfulResult: result.ErrorCode === 0,
      error: result.ErrorCode,
      errorMessage: result.Message,
      messageId: result.MessageID,
    });

    return mailingResult;
  });

  return results;
};

/**
 * Send content from the pitch to campaigns contacts
 * @param {number} ownerId  
 * @param {number} campaignId  
 * @returns 
 */
const sendEmails = async (ownerId, campaignId, paymentLastId) => {
  const {
    senderEmail, pitchId, sender, emailResponseAnalysis, boostOpenRate, duplicateWhatsApp, template,
    shedule, useTimeZone, hour, minute, year, month, day, successSendEmails, sendCopy, nft, videoPitch, 
    campaignDescription, boolAltEmailService } = await getCampaignById(ownerId, campaignId);

  if (successSendEmails) {
    return {
      status: 400,
      message: "Emails have already been sent."
    }
  }

  const { pitchTitle, pitchText } = await getPitchById(ownerId, pitchId);
  const { content } = await getMessageWithContentById(ownerId, pitchText);
  const contacts = await getContactsFromCampaign(ownerId, campaignId);

  // const parseContent = await parseText(content)
  const contactsToSend = [];

  contacts.forEach((contact) => {
    contactsToSend.push({
      "first_name": contact.firstName,
      "email": contact.email,
      "city": contact.city,
      "company": contact.companyName,
      "status": contact.status,
      "contact_id": contact.id
    })
  });

  const fields = {
    "owner_id": ownerId,
    "subject_campaign": campaignDescription,
    "dict_sender": {
      "first_name": sender,
      "email": senderEmail,
      "body": content,
      "subject": pitchTitle
    },
    "list_dict_recipients": contactsToSend,
    "bool_pr_assistant": emailResponseAnalysis,
    "bool_resending": boostOpenRate,
    "bool_whatsapp": duplicateWhatsApp,
    "bool_prai_template": template,
    "bool_send_copy": sendCopy,
    "bool_nft": nft,
    "bool_video_pitch": videoPitch,
    "bool_alt_email_service": boolAltEmailService
  }
  if (shedule) {
    fields['scheduled_dispatch_time'] = {
      "bool_use_recipients_time_zone": useTimeZone,
      "hour": hour,
      "minute": minute,
      "year": year,
      "month": month,
      "day": day
    }
  }
  const uni = unirest('POST', `${SERVICE_API_HOST}/postmark/send_batch_emails/`);

  uni.headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' });

  uni.send(fields);

  const response = await uni.then((res) => {
    if (res.error) return res.error;
    return res.body;
  });

  if (response.status === 200) {
    const record = await MailingSession.create({
      ownerId: ownerId,
      title: pitchTitle,
      contentId: pitchText,
      campaignId: campaignId,
      tag: response.result_sending.tracking_id,
    });

    contactsToSend.forEach(async (result, index) => {
      await MailingSessionResult.create({
        mailingSessionId: record.id,
        contactId: result.contact_id,
        successfulResult: true,
      });

    });

    await updateCampaign(ownerId, campaignId, { status: 'Completed', successSendEmails: true });

    if (paymentLastId) {
      await updateCurrentCamapaign(paymentLastId);
      await updateCurrentEmails(paymentLastId)
    } else {
      await updateCurrentCamapaignByOwnerId(ownerId);
      await updateCurrentEmailsByOwnerId(ownerId)
    }
  }

  return response
};

/**
 * Get report subjects 
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @returns 
 */
const influencersReports = async (ownerId, campaignId) => {
  const result = await MailingSession.findAndCountAll({
    where: { ownerId, campaignId },
    include: [
      {
        model: MailingSessionResult,
        attributes: ['successfulResult'],
        required: false,
      },
    ]
  });
  let successfulResult = 0
  result.rows.filter((res) => res?.MailingSessionResults?.filter((mail) => {
    if (mail?.successfulResult) successfulResult += 1
  }))
  const contacts = await getContactsFromCampaign(ownerId, campaignId)

  const subjectAll = await Promise.all(contacts.map(async (contact) => {
    const contactSubject = await ContactToSubjects.findAll({ where: { ContactId: contact.id } })
    return await Promise.all(contactSubject.map(async (value) => {
      return await Subject.findOne({ where: { id: value.SubjectId } })
    }));
  }))

  return {
    subjectAll,
    count: result?.count || 0,
    sent: successfulResult
  };
}

const getReports = async () => {
  const emailsOpened = await postmarkClient.getEmailOpenCounts();
  const sentCounts = await postmarkClient.getSentCounts();
  const clickCounts = await postmarkClient.getClickCounts();

  return {
    opened: emailsOpened.Opens,
    sent: sentCounts.Sent,
    clickCounts,
  };
};

/**
 * Create business request and send email by Postmark Api
 * @param {string} name 
 * @param {string} email 
 * @param {string} phone 
 * @param {string} message 
 * @returns 
 */
const sendBusinessRequest = async (name, email, phone, message) => {
  await BusinessRequest.create({
    name,
    email,
    phone,
    message,
  });

  const fields = {
    name,
    email,
    phone,
    message,
  }
  const response = await sendRequest('POST', 'send_request_contact', fields)

  return response;
};

/**
 * Universal send request by Python Api 
 * @param {string} method 
 * @param {string} url 
 * @param {*} fields 
 * @returns 
 */
const sendRequest = async (method, url, fields) => {
  const uni = unirest(method, `${SERVICE_API_HOST}/postmark/${url}/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field(fields);

  const response = await uni.then((res) => {
    if (res.error) return res.error;
    return res.body;
  });
  return response
}

/**
 * Send an email from contact@prai.co about the end of the free subscription.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @returns 
 */
const sendEmailEndFreeTrial = async (email_recipient, first_name) => {
  const fields = {
    email_recipient,
    first_name
  }
  const response = await sendRequest('POST', 'send_email_end_free_trial', fields);

  return response
}

/**
 * Send an email from contact@prai.co about an error in payment by card.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @param {string} url_payment_settings 
 * @returns 
 */
const sendEmailFailPayment = async (email_recipient, firstName, url_payment_settings) => {
  const fields = {
    email_recipient,
    first_name: firstName,
    url_payment_settings
  }
  const response = await sendRequest('POST', 'send_email_fail_payment', fields);

  return response
}

/**
 * Send a payment request email from contact@prai.co.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @param {string} url_payment 
 * @param {object} price  
 * @returns 
 */
const sendEmailPayment = async (email_recipient, firstName, url_payment, price) => {
  const fields = {
    email_recipient,
    first_name: firstName,
    url_payment,
    price: (price.unit_amount / 100).toFixed(2),
    plan: price.product.name,
    frequency: price.recurring.interval == "month" ? 'monthly' : 'annually'
  }

  const response = await sendRequest('POST', 'send_email_payment', fields);

  return response
}

/**
 * Send an email from contact@prai.co with a payment receipt.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @param {string} url_download_receipt
 * @returns 
 */
const sendEmailReceipt = async (email_recipient, first_name, url_download_receipt) => {
  const fields = {
    email_recipient,
    first_name,
    url_download_receipt
  }
  const response = await sendRequest('POST', 'send_email_receipt', fields);
  return response
}

/**
 * Send a password remind email from contact@prai.co.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @param {string} ownerId 
 * @returns 
 */
const sendEmailRemindPassword = async (email_recipient, first_name, ownerId) => {

  const newPassword = await generatePassword();
  const fields = {
    email_recipient,
    first_name,
    password_recipient: newPassword
  }

  const response = await sendRequest('POST', 'send_email_remind_password', fields);
  if (response.status == 200) {
    const user = await User.findOne({ where: { id: ownerId } });
    await user.update({ password: await bcrypt.hash(newPassword, 10) });
  }
  return response
}


/**
 * Send a password remind email from contact@prai.co.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @param {string} ownerId 
 * @returns 
 */
const sendEmailResetPassword = async (email_recipient, first_name, url_reset_password) => {
  const fields = {
    email_recipient,
    first_name,
    url_reset_password
  }

  const response = await sendRequest('POST', 'send_email_reset_password', fields);

  return response
}

const generatePassword = async () => {
  const length = Math.floor(Math.random() * 8) + 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

/**
 * Send an email from contact@prai.co about account activation.
 * @param {string} email_recipient 
 * @param {string} first_name
 * @returns 
 */
const sendEmailRegister = async (email_recipient, first_name) => {
  const fields = {
    email_recipient,
    first_name
  }

  const response = await sendRequest('POST', 'send_email_register', fields);

  return response
}

/**
 * Send a message from the sender's email containing information 
 * (pitch, contact, text, etc.) for the recipient.
 * @param {string} email_recipient 
 * @param {string} first_name_sender 
 * @param {string} email_sender 
 * @param {string} company_sender 
 * @param {string} url_sharing 
 * @returns 
 */
const sendEmailSharing = async (email_recipient, first_name_sender, email_sender, company_sender, url_sharing) => {
  const fields = {
    email_recipient,
    first_name_sender,
    email_sender,
    company_sender,
    url_sharing
  }
  const response = await sendRequest('POST', 'send_email_sharing', fields);

  return response
}

/**
 * Send an email from contact@prai.co about the start of a free subscription.
 * @param {string} email_recipient 
 * @param {string} first_name 
 * @returns 
 */
const sendEmailStartFreeTrial = async (email_recipient, first_name) => {

  const fields = {
    email_recipient,
    first_name
  }
  const response = await sendRequest('POST', 'send_email_start_free_trial', fields);

  return response
}

const getCountSentEmail = async (ownerId, createdAt) => {
  try {
    const result = await MailingSession.findAndCountAll({
      where: {
        ownerId,
        createdAt: {
          [Op.gte]: createdAt
        }
      },
      include: [
        {
          model: MailingSessionResult,
          attributes: ['successfulResult'],
          required: true,
        },
      ]
    });
    let successfulResult = 0
    result.rows.filter((res) => res?.MailingSessionResults?.filter((mail) => {
      if (mail?.successfulResult) successfulResult += 1
    }))
    return successfulResult
  } catch (error) {
    return 0
  }
}

const getCountSentEmailSinceLastPayment = async (ownerId) => {
  const { createdAt } = await getLastPayment(ownerId)
  return await getCountSentEmail(ownerId, createdAt)
}

/**
 * Send a user request for a faq to sales@prai.co  
 * @param {string} email 
 * @param {string} type_message 
 * @param {string} message 
 * @returns 
 */
const sendFaq = async (email, type_message, message) => {
  const fields = {
    email,
    type_message,
    message,
  }

  const uni = unirest('POST', `${SERVICE_API_HOST}/postmark/faq/`);

  uni.headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' });

  uni.send(fields);

  const response = await uni.then((res) => {
    if (res.error) return res.error;
    return res.body;
  });

  return response
}

/**
 * Send invite member
 * @param {string} email_recipient 
 * @param {string} first_name_sender 
 * @param {string} email_sender 
 * @param {string} company_sender 
 * @returns 
 */
const sendInvite = async (email_recipient, first_name_sender, email_sender, company_sender) => {
  const fields = {
    first_name_sender,
    email_recipient,
    email_sender,
    company_sender,
    url_invitation: URL_INVITE
  }

  const response = await sendRequest('POST', 'send_invitation', fields);

  return response
}

/**
 * Send request demo
 * @param {string} plan 
 * @param {string} name 
 * @param {string} phone 
 * @param {string} email 
 * @param {string} company 
 * @param {string} message 
 * @returns 
 */
const sendDemo = async (plan, name, phone, email, company, message) => {
  const fields = {
    plan,
    name,
    phone,
    email,
    company,
    message
  }

  const response = await sendRequest('POST', 'send_request_demo', fields);

  return response
}

module.exports.sendEmailRegister = sendEmailRegister;
module.exports.sendEmailSharing = sendEmailSharing;
module.exports.sendRecoverSuccessEmail = sendRecoverSuccessEmail;
module.exports.getCountSentEmail = getCountSentEmail
module.exports.getCountSentEmailSinceLastPayment = getCountSentEmailSinceLastPayment;
module.exports.sendRequest = sendRequest;

module.exports = {
  sendRecoverSuccessEmail,
  sendUserTeamInviteEmail,
  sendEmailsToRecipients,
  getReports,
  sendBusinessRequest,
  sendEmails,
  influencersReports,
  sendEmailEndFreeTrial,
  sendEmailFailPayment,
  sendEmailPayment,
  sendEmailReceipt,
  sendEmailRemindPassword,
  sendEmailStartFreeTrial,
  sendRequest,
  getCountSentEmail,
  getCountSentEmailSinceLastPayment,
  sendEmailResetPassword,
  sendFaq,
  sendInvite,
  sendDemo,
  sendEmailRegister,
  sendVerifyCode
};
