const { EmailsTrial } = require('../models/emailsTrialModel');
const { Profile } = require('../models/profileModel');
const { PromoCode } = require('../models/promoCodeModel');
const { NotFoundError } = require('../utils/errors');
const { getUser, getUserByEmail } = require('./userService');
const stripeService = require('./stripeService');

/**
 * Creation profile 
 * @param {number} ownerId 
 * @param {string} type start or premium 
 * @param {string} interval 
 * @returns {Object} created profile 
 */
const createProfile = async (ownerId, type, interval) => {
  // const profiles = await Profile.findAll({
  //   where: { ownerId },
  //   order: [['createdAt', 'desc']],
  // });

  // for (let profile of profiles) {
  //   try {
  //     await profile.destroy()
  //   } catch (error) { }
  // }
  const { countUsers, countSizes, countEmails, countCampaigns, countDocuments } = await getLimitByType(type, interval)

  return await Profile.create({
    ownerId,
    type,
    countUsers,
    countSizes,
    countEmails,
    countCampaigns,
    countDocuments,
  });
};

const generatePromoCode = async () => {
  let promoCode = "";
  // const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (var i = 0; i <= 9; i++)
    promoCode += possible.charAt(Math.floor(Math.random() * possible.length));

  return promoCode;
}

const savePromoCode = async () => {
  await PromoCode.destroy({
    where: {},
    truncate: true
  })

  await PromoCode.create({
    promoCode: '1DAYONLYY3',
    type: "Start 25"
  })
  await PromoCode.create({
    promoCode: '1DAYONLYYs',
    type: "Start 25"
  })
  await PromoCode.create({
    promoCode: '1DAYONLYYj',
    type: "Start 25"
  })

  await PromoCode.create({
    promoCode: '1DAYONLYYk',
    type: "Start 50"
  })
  await PromoCode.create({
    promoCode: 'TAKEITALLh',
    type: "Start 50"
  })
  await PromoCode.create({
    promoCode: 'TAKEITALLO',
    type: "Start 50"
  })
  // 25
  await PromoCode.create({
    promoCode: 'TAKEITALLE',
    type: "Premium 25"
  })
  await PromoCode.create({
    promoCode: 'TAKEITALLq',
    type: "Premium 25"
  })
  await PromoCode.create({
    promoCode: 'GIFTGUIDE0',
    type: "Premium 25"
  })

  await PromoCode.create({
    promoCode: 'YPDLOXJVZK',
    type: "Premium 25"
  })  

  await PromoCode.create({
    promoCode: 'MYSTERYDEa',
    type: "Premium 25"
  })

  await PromoCode.create({
    promoCode: 'MYSTERYDEb',
    type: "Premium 25"
  })

  await PromoCode.create({
    promoCode: 'MYSTERYDEc',
    type: "Premium 25"
  })

  // 50 +
  await PromoCode.create({
    promoCode: 'GIFTGUIDEJ',
    type: "Premium 50"
  })
  await PromoCode.create({
    promoCode: 'GIFTGUIDEN',
    type: "Premium 50"
  })
  await PromoCode.create({
    promoCode: 'GIFTGUIDEm',
    type: "Premium 50"
  })


  await PromoCode.create({
    promoCode: 'WELCOME11a',
    type: "Premium 50"
  })

  await PromoCode.create({
    promoCode: 'WELCOME11b',
    type: "Premium 50"
  })

  await PromoCode.create({
    promoCode: 'WELCOME11c',
    type: "Premium 50"
  })
  // for life
  await PromoCode.create({
    promoCode: 'FLASHSALEk',
    type: "Start for life"
  })
  await PromoCode.create({
    promoCode: 'FLASHSALEW',
    type: "Start for life"
  })

  await PromoCode.create({
    promoCode: 'NOTRICKSny',
    type: "Start for life"
  })

  await PromoCode.create({
    promoCode: 'NOTRICKSyJ',
    type: "Start for life"
  })


  await PromoCode.create({
    promoCode: 'NOTRICKSuu',
    type: "Premium for life"
  })
  await PromoCode.create({
    promoCode: 'NOTRICKSOi',
    type: "Premium for life"
  })

  await PromoCode.create({
    promoCode: 'FLASHSALEJ',
    type: "Premium for life"
  })
  await PromoCode.create({
    promoCode: 'FLASHSALEu',
    type: "Premium for life"
  })

  await PromoCode.create({
    promoCode: 'FLASHSALEc',
    type: "Start 1$"
  })

  const all = await PromoCode.findAll()
  return all
}

const getPromoCode = async () => {
  return PromoCode.findAll()
}

const savePromo = async(promoCode, type) => {
  return await PromoCode.create({
    promoCode,
    type
  })
}
/**
 * Get profile by owner id
 * @param {number} ownerId 
 * @returns 
 */
const getProfile = async (ownerId, profileId, check = false) => {
  if (profileId) {
    const profile = await Profile.findOne({
      where: { id: profileId },
    });
    if (!profile) {
      return {
        message: 'Profile not found',
        status: 400
      }
    }
    return profile
  }
  const profile = await Profile.findOne({
    where: { ownerId },
    order: [['createdAt', 'desc']],
  });
  if (!profile) {
    if (check) {
      return {
        message: 'Profile not found',
        status: 400
      }
    }
    throw new NotFoundError('Profile not found', ownerId);
  }
  return profile;
};

const deleteProfile = async (ownerId) => {
  const profile = await getProfile(ownerId)
  return await profile.destroy()
}

/**
 * get Count Sizes 
 * @param {number} ownerId 
 * @returns 
 */
const getCountSizes = async (ownerId) => {
  const profile = await Profile.findOne({
    where: { ownerId },
    order: [['createdAt', 'desc']],
  });
  if (!profile) {
    await createProfile(ownerId, 'Start', 'month');
    return 1;
  }
  return profile.countSizes;
};

/**
 * Update profile by owner id
 * @param {number} ownerId 
 * @returns 
 */
const updateProfile = async (ownerId, darkMode, timeZone, country, language, paymentReminders, productUpdates, tipsInspiration) => {
  const profile = await Profile.findOne({
    where: { ownerId },
    order: [['createdAt', 'desc']],
  });
  if (!profile) throw new NotFoundError('Profile not found', ownerId);
  const update = {}

  if (darkMode !== undefined) {
    update['darkMode'] = darkMode
  }
  if (timeZone !== undefined) {
    update['timeZone'] = timeZone
  }
  if (country !== undefined) {
    update['country'] = country
  }
  if (language !== undefined) {
    update['language'] = language
  }
  if (paymentReminders !== undefined) {
    update['paymentReminders'] = paymentReminders
  }
  if (productUpdates !== undefined) {
    update['productUpdates'] = productUpdates
  }

  if (tipsInspiration !== undefined) {
    update['tipsInspiration'] = tipsInspiration
  }

  profile.update(update)

  await profile.save()

  return profile;
};

const getLimitByType = async (type, interval) => {
  let countUsers, countSizes, countEmails, countCampaigns, countDocuments;

  switch (type) {
    case 'Start':
      if (interval == "month") {
        countUsers = 1;
        countSizes = 1;
        countEmails = 10000;
        countCampaigns = 10;
        countDocuments = 20;
      } else if (interval == 'year') {
        countUsers = 10;
        countSizes = 10;
        countEmails = 100000;
        countCampaigns = 100;
        countDocuments = 200;
      }
      break;
    case 'Trial':
      countUsers = 1;
      countSizes = 1;
      countEmails = 10000;
      countCampaigns = 10;
      countDocuments = 20;
      break;
    case 'Student':
      if (interval == "month") {
        countUsers = 1;
        countSizes = 1;
        countEmails = 10000;
        countCampaigns = 10;
        countDocuments = 20;
      } else if (interval == 'year') {
        countUsers = 10;
        countSizes = 10;
        countEmails = 100000;
        countCampaigns = 100;
        countDocuments = 200;
      }
      break;
    case 'Premium':
      if (interval == "month") {
        countUsers = 3;
        countSizes = 3
        countEmails = 20000;
        countCampaigns = 20;
        countDocuments = 100;
      } else if (interval == 'year') {
        countUsers = 30;
        countSizes = 30;
        countEmails = 200000;
        countCampaigns = 200;
        countDocuments = 1000;
      }
      break;
    default: throw new Error('User type error');
  }
  return {
    countUsers,
    countSizes,
    countEmails,
    countCampaigns,
    countDocuments
  }
}

const updateLimitProfile = async (ownerId, type, interval) => {
  const { countUsers, countSizes, countEmails, countCampaigns, countDocuments } = await getLimitByType(type, interval)

  const profile = await Profile.findOne({
    where: { ownerId },
    order: [['createdAt', 'desc']],
  });
  if (!profile) throw new NotFoundError('Profile not found', ownerId);

  profile.update({ countUsers, countSizes, countEmails, countCampaigns, countDocuments })

  await profile.save()

  return profile;
}

const saveEmailTrial = async (email) => {
  const person = await EmailsTrial.findOne({
    where: {
      email
    }
  })
  if (!person) {
    await EmailsTrial.create({
      email,
      success: true
    })
  }
}

const getEmailTrial = async (email) => {
  const person = await EmailsTrial.findOne({
    where: {
      email
    }
  })
  return person?.success || false
}

const getAllProfilies = async (status) => {
  const profiles = await Profile.findAll({
    where: {
      type: 'Trial'
    }
  })

  if (status) {
    for (let index = 0; index < profiles.length; index++) {
      const element = profiles[index];
      try {
        const user = await getUser(element.ownerId)

        try {
          if (user.subscriptionId) await stripeService.deleteSubscription(user.subscriptionId)
        } catch (error) { }
        try {
          if (user.customerId) await stripeService.deleteCustomer(user.customerId)
        } catch (error) { }
        try {
          await deleteProfile(element.ownerId)
        } catch (error) { }
        console.log('delete user');
        user.destroy()
  
        const person = await EmailsTrial.findOne({
          where: {
            email: user.email
          }
        })
        if (person) {
          console.log('delete trial');
          person.destroy()
        }
      } catch (error) {
        console.log('err', error);
      }
     

    }
  }

  return profiles;
}

const deleteAccounts = async(listAccount) => {
  for (let index = 0; index < listAccount.length; index++) {
    const email = listAccount[index];

    try {
      const user = await getUserByEmail(email);
      try {
        if (user.subscriptionId) await stripeService.deleteSubscription(user.subscriptionId)
      } catch (error) { }
      try {
        if (user.customerId) await stripeService.deleteCustomer(user.customerId)
      } catch (error) { }
      try {
        await deleteProfile(user.id)
      } catch (error) { }
      console.log('delete user');
      user.destroy()

      const person = await EmailsTrial.findOne({
        where: {
          email: user.email
        }
      })
      if (person) {
        console.log('delete trial');
        person.destroy()
      }
    } catch (error) {
      console.log('err', error.message);
    }
  }
}

module.exports = {
  createProfile,
  getProfile,
  getCountSizes,
  updateProfile,
  deleteProfile,
  updateLimitProfile,
  savePromoCode,
  saveEmailTrial,
  getEmailTrial,
  getPromoCode,
  getAllProfilies,
  savePromo,
  deleteAccounts
};
