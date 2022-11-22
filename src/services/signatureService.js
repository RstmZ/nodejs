const unirest = require('unirest');
const { Signature } = require('../models/signatureModel');
const { sendRequest } = require('./mailService');
const mailService = require('./mailService')
const { SERVICE_API_HOST } = process.env;

/**
 * Create domain by Postmark Api
 * @param {string} domain 
 * @returns 
 */
const createDomain = async (domain) => {
  const uni = unirest('POST', 'https://api.postmarkapp.com/domains');

  uni.headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Postmark-Account-Token': process.env.POSTMARK_ACCOUNT_API_TOKEN,
  });

  uni.send({ Name: domain });

  const response = await uni.then((res) => res.body);

  return response;
};

/**
 * Create signature by Postmark Api
 * @param {number} ownerId 
 * @param {string} FromEmail 
 * @param {string} Name 
 * @returns 
 */
const createSignature = async (ownerId, FromEmail, Name) => {
  const domain = FromEmail.split('@').pop();

  const uni = unirest('POST', `${SERVICE_API_HOST}/postmark/send_verification/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });
  const keyValue = {
    email: FromEmail,
    first_name: Name,
    last_name: ''
  }
  uni.field(keyValue);

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });
  const isDomain = await Signature.findOne({ where: { domain } });

  let domainID = isDomain?.domainId;
  if (!domainID) {
    const newDomain = await createDomain(domain);
    domainID = newDomain.ID;
  }

  const isEmail = await Signature.findOne({ where: { fromEmail: FromEmail } });
  if (!isEmail) {
    const result = await getRecordEmails(FromEmail)
    if(result){
      await Signature.create({
        name: Name,
        fromEmail: FromEmail,
        ownerId,
        domain: result.Domain,
        domainId: domainID,
        signatureId: result.ID,
        confirmed: result.Confirmed
      });
    }
  }

  return response;
};

/**
 * Check verification email and domain
 * @param {string} email 
 * @returns 
 */
const checkVerification = async (email) => {
  const result = {
    verify_email: false,
    verify_domain: false
  }
  const domain = await getCheckDomain(email);
 
  result["verify_domain"] = domain?.bool_verified
 
  const record = await getCheckEmailInfo(email)
 
  result["verify_email"] = record?.bool_verified || false
  
  return result 
};
 

/**
 * Check domain by Python Api
 * @param {string} email
 * @returns 
 */
const getCheckDomain = async (email) => {
  const fields = {
    email
  }

  const response = await mailService.sendRequest('POST', 'domain_info', fields)
  return response
}

/**
 * Check domain by Python Api
 * @param {string} email
 * @returns 
 */
 const getCheckEmailInfo = async (email) => {
  const fields = {
    email
  }

  const response = await mailService.sendRequest('POST', 'email_info/v2', fields)
  return response
}

/**
 * Check email record
 * @param {string} emailAddress 
 * @returns 
 */
const getRecordEmails = async (emailAddress) => {
  const uni = unirest('GET', `https://api.postmarkapp.com/senders?count=50&offset=0`);

  uni.headers({
    Accept: 'application/json',
    'X-Postmark-Account-Token': process.env.POSTMARK_ACCOUNT_API_TOKEN,
  });
  const response = await uni.then((res) => res.body)
  const senders = response.SenderSignatures
  const record = senders.find(element => element.EmailAddress === emailAddress)

  return record;
}


const getAllDomain = async () => {
  const uni = unirest('GET', `https://api.postmarkapp.com/domains?count=50&offset=0`);

  uni.headers({
    Accept: 'application/json',
    'X-Postmark-Account-Token': process.env.POSTMARK_ACCOUNT_API_TOKEN,
  });

  const response = await uni.then((res) => res.body);
  const domain = response.Domains
  const res = await Signature.findAll()
  for (let ind = 0; ind <= res.length - 1; ind++) {
    const record = res[ind]
    const isDomain = domain.find(element => element.Name === record.domain)
    if (isDomain) {
      await Signature.update({ domainId: isDomain.ID }, {
        where: {
          id: record.id,
        },
      });
    }
  }

  return domain
}

module.exports = {
  createSignature,
  checkVerification,
  createDomain,
  getAllDomain
};
