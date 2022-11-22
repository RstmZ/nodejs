const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User } = require('../models/userModel');
const { ResetToken } = require('../models/resetTokenModel');
const { InvitationToken } = require('../models/invitationTokenModel');
const { ValidationError } = require('../utils/errors');
const { sendEmailResetPassword } = require('./mailService');
const mailService = require('./mailService');
const logger = require('../winston');
const { PaymentInfo } = require('../models/paymentInfoModel');
const { PaymentResult } = require('../models/paymentResultModel');
const stripeService = require('./stripeService')

const { getUser, isSignUp, verifyCodeSignUpSW, isSignIn, testAccountIsPay } = require('./userService');
const { SessionUser } = require('../models/sessionUserModel');
const { getCountCampaign, getCountCampaignSinceLastPayment } = require('./campaignService');
const { getCountDocument, getCountDocumentSinceLastPayment, getFilesSize } = require('./fileService');
const { getLastPayment, getMoneyBeenPaidSinceRegister } = require('./paypalService');
const { Op } = require('sequelize');
const { getCountGenerateSinceLastPayment } = require('./pitchService');
const { createErrorMessage } = require('./errorMessageService');
const { getUserTeam, createUserTeam } = require('./userTeamService');
const { UserTeamMember } = require('../models/userTeamMemberModel');
const { getProfile, getCountSizes } = require('./profileService');
const { isTestEmailSignIn } = require('../utils/checkEmailTest');

const { FROM_EMAIL } = process.env

/**
 * User registration
 * @param {string} email 
 * @param {string} password 
 * @param {string} picture 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} organization 
 * @returns {Object} created user 
 */
const registration = async (
  email,
  password,
  picture,
  firstName,
  lastName = '',
  organization = '',
  city = '',
  typeSignUp = 'Simple'
) => {
  let user = await User.findOne({ where: { email } });
  if(user?.success == false) {
    user.destroy()
    user = undefined;
  }
  if (user && user?.password !== 'No_Password') {
    if (user.typeSignUp !== "Simple") {
      throw new ValidationError('Threre`s already a PR AI account associated with this email throught a social sing-in method. Please choose a social provider below to sing in.', email);
    }
    throw new ValidationError('User with this email already exists.', email);
  }

  if (user?.password === 'No_Password') {
    await user.update({
      email,
      password: await bcrypt.hash(password, 10),
      picture,
      firstName,
      lastName,
      organization,
      city,
      typeSignUp
    });
  } else {
    user = await User.create({
      email,
      password: await bcrypt.hash(password, 10),
      picture,
      firstName,
      lastName,
      organization,
      city,
      typeSignUp
    });
  }
  const { customerId, ...userData } = { ...user.toJSON() };
  delete userData?.password;
  return userData;
};
/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns 
 */
const signIn = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user?.password))) {
    throw new ValidationError('Your password is incorrect or this account doesn`t exist. Please reset your password or create a new account.', email);
  }

  const result = { ...user.toJSON() };
  delete result.password;
  return result;
};

const signInSocialNetwork = async (email) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return {
      message: 'Your password is incorrect or this account doesn`t exist. Please reset your password or create a new account.'
    };
  }
  const { password, ...result } = { ...user.toJSON() }
  return result
};

const upsertGoogleRegister = async (email, name, picture) => {
  const user = await User.findOne({ where: { email, success: true } });

  if (user) {
    return {
      message: "User is arleady exists"
    }
  }

  const [firstName, lastName] = name.split(' ')

  await mailService.sendEmailRegister(email, firstName)

  const newUser = await registration(
    email, 'mypassword', '', firstName, lastName, '', '', 'Google'
  );
  newUser.firstName = firstName;
  newUser.lastName = lastName;
  // newUser.picture = picture;
  await verifyCodeSignUpSW(newUser.id, email)
  return newUser;
};

const upsertFacabookRegister = async (email, name, picture) => {
  const user = await User.findOne({ where: { email } });

  if (user) {
    return {
      message: "User is arleady exists"
    }
  }
  const [firstName, lastName] = name.split(' ')

  await mailService.sendEmailRegister(email, firstName)

  const newUser = await registration(
    email, 'mypassword', '', firstName, lastName, '', '', 'Facebook'
  );
  newUser.firstName = firstName;
  newUser.lastName = lastName;
  // newUser.picture = picture;
  await verifyCodeSignUpSW(newUser.id, email)

  return newUser;
};


/**
 * Recover
 * @param {string} email 
 * @param {string} redirect 
 * @returns 
 */
const recover = async (email, redirect) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    logger.info(new ValidationError('No user with such email.', email).stack);
    return;
  }

  const cryptoToken = crypto.randomBytes(30).toString('hex');

  let resetToken = await ResetToken.findOne({ where: { UserId: user.id } });

  if (resetToken) {
    const timeout = 60000; // 1 minute in ms
    if (Number(resetToken.updatedAt) + timeout > Date.now()) {
      throw new ValidationError('You cannot ask for a letter more than once a minute.', email);
    }
    const newValue = await ResetToken.update({ token: cryptoToken }, {
      where: {
        token: resetToken.token,
      },
    });
    if (!newValue[0]) {
      logger.info(new ValidationError('This token has already been updated.', email).stack);
      return;
    }
  } else {
    try {
      resetToken = await ResetToken.create({ token: cryptoToken, UserId: user.id });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        logger.info(new ValidationError('This token has already been created.', email).stack);
        return;
      }
      throw err;
    }
  }
  const urlReset = `https://app.prai.co/${redirect}?token=${cryptoToken}`;

  return await sendEmailResetPassword(email, user.firstName, urlReset)
};

/**
 * Reset
 * @param {string} token 
 * @param {string} newPassword 
 * @returns 
 */
const reset = async (token, newPassword) => {
  const resetToken = await ResetToken.findOne({ where: { token } });
  const user = await User.findOne({ where: { id: resetToken.UserId } });
  if (!resetToken || !user) {
    throw new ValidationError('Password reset token is invalid.', resetToken.UserId);
  }
  const expirationPeriod = 3600000; // one hour in ms
  if (Number(resetToken.updatedAt) + expirationPeriod < Date.now()) {
    throw new ValidationError('Password reset token has expired.', user.id);
  }
  const deleted = await ResetToken.destroy({ where: { token } });
  if (!deleted) {
    logger.info(new ValidationError('This token has already been deleted.', user.id).stack);
    return;
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await mailService.sendRecoverSuccessEmail(user);
};

/**
 * Send a link to the mail of an unregistered user 
 * @param {string} email - mail of an unregistered user
 * @param {string} link - View link for unregistered user
 * @param {string} comanyName  
 * @param {string} userId 
 * @param {string} firstName 
 * @returns {} linkWithToken - link with token
 */
const sendLink = async (email, link, comanyName, userId, firstName) => {
  const invitationToken = crypto.randomBytes(30).toString('hex');

  const linkWithToken = `${link}/?invitationToken=${invitationToken}`;

  const result = await mailService.sendEmailSharing(email, firstName, FROM_EMAIL, comanyName, linkWithToken)
  if (result.status == 200) {
    await InvitationToken.create({ token: invitationToken, userId });
    return {
      ...result,
      invitationToken
    }
  }

  return {
    ...result
  }
};
/**
 * Checking the token for validity
 * @param {string} token 
 * @returns 
 */
const isValidToken = async (token) => {
  const result = await InvitationToken.findOne({ where: { token } });
  if (!result) {
    return {
      message: 'token not find',
    };
  }
  return {
    message: 'ok',
  };
};

/**
 * Create payment method 'PayPal' or 'Credit card'
 * @param {number} ownerId 
 * @param {string} methodPayment - 'PayPal' or 'Credit card'
 * @param {string} priceId 
 * @returns 
 */
const createPaymentMethod = async (ownerId, methodPayment, priceId) => {

  const result = await PaymentInfo.create({
    ownerId,
    methodPayment,
    priceId
  })
  if (methodPayment == 'Credit card') {
    const { code, current_period_end, client_secret, ...subscription } = await stripeService.getByUserIdSubscription(ownerId);

    if (!current_period_end || !client_secret) {
      
      try {
        await stripeService.deleteSubscription(subscription.id)
      } catch (error) { }

      const user = await getUser(ownerId)
      const { clientSecret } = await stripeService.createSubscription(ownerId, user.customerId, priceId);
      return {
        clientSecret: clientSecret,
        paymentMethodId: result.id
      }
    }
    const success_active = current_period_end <= new Date;

    if (success_active) {
      try {
        await stripeService.deleteSubscription(subscription.id)
      } catch (error) { }

      const user = await getUser(ownerId)
      const { clientSecret } = await stripeService.createSubscription(ownerId, user.customerId, priceId);
      return {
        clientSecret: clientSecret,
        paymentMethodId: result.id
      }
    }
    return {
      clientSecret: client_secret,
      paymentMethodId: result.id
    }
  }
  // Pay pal 
  return result
}

/**
 * Get payment info
 * @param {number} ownerId 
 * @returns 
 */
const getPaymentInfo = async (ownerId) => {
  return await PaymentInfo.findOne({
    where: { ownerId },
    order: [['createdAt', 'DESC']]
  })
}

/**
 * Get info status payment
 * @param {number} ownerId 
 * @param {string} status 
 */
const getInfoStatusPayment = async (ownerId, status) => {
  const paymentInfo = await getPaymentInfo(ownerId)
  if (!paymentInfo) {
    await createErrorMessage(ownerId, 'No payment method in user')
    return {
      code: 1001
    }
  }

  if (paymentInfo.methodPayment == 'PayPal') {
    const result = await PaymentResult.findOne({
      where: {
        ownerId,
        paymentMethodId: paymentInfo.id
      }
    })

    return {
      success: result?.success || false
    };
  }
  // stripe
  // requires_payment_method, requires_confirmation, requires_action, processing, canceled,
  if (status == "requires_payment_method") {
    await createErrorMessage(ownerId, `User's payment status ${status}`)
    return {
      code: 1002
    }
  }
  if (status == "requires_confirmation") {
    await createErrorMessage(ownerId, `User's payment status ${status}`)
    return {
      code: 1003
    }
  }
  if (status == "requires_action") {
    await createErrorMessage(ownerId, `User's payment status ${status}`)
    return {
      code: 1004
    }
  }
  if (status == "processing") {
    await createErrorMessage(ownerId, `User's payment status ${status}`)
    return {
      code: 1005
    }
  }
  if (status == "canceled") {
    await createErrorMessage(ownerId, `User's payment status ${status}`)
    return {
      code: 1006
    }
  }
  // succeeded
  return {
    success: true
  }

}

/**
 * Create session user
 * @param {number} ownerId 
 */
const createSession = async (ownerId) => {
  await SessionUser.create({
    ownerId,
    dateLogin: Date.now()
  })
}

/**
 * Update session user
 * @param {number} ownerId 
 * @returns 
 */
const updateSessionUser = async (ownerId) => {
  const session = await SessionUser.findOne({
    where: {
      ownerId,
      dateLogin: {
        [Op.ne]: null,
      },
    },
    order: [['createdAt', 'DESC']],
  })

  if (!session) {
    return
  }
  const dateLogout = Date.now()
  session.update({ dateLogout: dateLogout, duration: await diff_minutes(dateLogout, session.dateLogin) })
}

const diff_minutes = async (dt2, dt1) => {
  let diff = (dt2 - dt1.getTime());
  diff = Math.round(((diff % 86400000) % 3600000) / 60000) // in minutes  
  return diff;
}

/**
 * Info user
 * @param {*} ownerId 
 * @param {*} createdAt
 * @returns 
 */
const infoUser = async (ownerId, createdAt) => {
  const countCampaignSinceRegister = await getCountCampaign(ownerId, createdAt)
  const countCampaignSinceLastPayment = await getCountCampaignSinceLastPayment(ownerId)
  const countDocumentSinceRegister = await getCountDocument(ownerId, createdAt)
  const countDocumentSinceLastPayment = await getCountDocumentSinceLastPayment(ownerId)

  const countSentEmailSinceRegister = await mailService.getCountSentEmail(ownerId, createdAt)
  const countSentEmailSinceLastPayment = await mailService.getCountSentEmailSinceLastPayment(ownerId)
  const countSentShareSinceLastPayment = await getCountSentShareSinceLastPayment(ownerId)
  const countGenerateSinceLastPayment = await getCountGenerateSinceLastPayment(ownerId)
  const moneyBeenPaidSinceRegister = await getMoneyBeenPaidSinceRegister(ownerId, createdAt);

  return {
    countCampaignSinceRegister,
    countCampaignSinceLastPayment,
    countDocumentSinceRegister,
    countDocumentSinceLastPayment,
    countSentEmailSinceRegister,
    countSentEmailSinceLastPayment,
    countSentShareSinceLastPayment,
    countGenerateSinceLastPayment,
    moneyBeenPaidSinceRegister
  }
}


const getCountSentShareSinceLastPayment = async (ownerId) => {
  const { createdAt } = await getLastPayment(ownerId)
  const { count } = await InvitationToken.findAndCountAll({
    where: {
      userId: ownerId,
      createdAt: {
        [Op.gte]: createdAt
      }
    }
  })
  return count
}

const getMembers = async (ownerId, email, firstName) => {
  const isUserTeam = await UserTeamMember.findOne({ where: { ownerId, email: email } });
  if (!isUserTeam) {
    await createUserTeam(ownerId, email, 'Admin', firstName);
  }
  const memberUser = await getUserTeam(ownerId)

  return memberUser
}

const getAllPayment = async (ownerId, priceId) => {
  const allInfo = await PaymentInfo.findAll({
    where: {
      ownerId,
      priceId
    }
  })
  const allPayment = await PaymentResult.findAll({
    where: {
      ownerId,
      success: true
    }
  })
  return {
    allInfo,
    allPayment
  }
}

const isLoggedIn = async (ownerId, email, firstName, picture, subscriptionIsActive, profileId) => {
  const isSuccessSignIn = await isSignIn(ownerId, email)
  if (!isSuccessSignIn) { // not verify email
    return {
      code: 1011,
      ownerId,
      email
    }
  }
  const profile = await getProfile(ownerId, profileId, true)

  const countSizes = await getCountSizes(ownerId);
  const size = await getFilesSize(ownerId);

  if (profile.type == "Trial") {
    const current_period_end = profile.createdAt
    current_period_end.setDate(profile.createdAt.getDate() + 14); 

    if (current_period_end) {
      const today = new Date()
      const success_active = current_period_end <= today;

      if (success_active) {
        await createErrorMessage(ownerId, 'Trial period expired')

        // await mailService.sendEmailEndFreeTrial(email, firstName)

        return {
          message: "Trial period expired",
          ownerId,
          type: profile.type,
          email,
          firstName,
          picture,
          unreadNotifications: 3,
          totalDiskSpace: countSizes || 0,
          availableDiskSpace: size || 0,
          current_period_end
        }
      }
    }
    return {
      ownerId,
      type: profile.type,
      email,
      firstName,
      picture,
      unreadNotifications: 3,
      totalDiskSpace: countSizes || 0,
      availableDiskSpace: size || 0,
      current_period_end
    };
  } else {

    if (await isTestEmailSignIn(email)) {
      return {
        ownerId, 
        email,
        firstName,
        picture, 
        subscriptionIsActive,
        unreadNotifications: 3,
        totalDiskSpace: countSizes || 0,
        availableDiskSpace: size || 0, 
      };
    }
  
    try {
      // code 1007
      const { code, trial_start, trial_end, status_invent, items, ...subscription } = await stripeService.getByUserIdSubscription(ownerId)

      const item = items?.data?.[0]

      const pricePlan = item?.price

      const clientSecret = subscription?.pending_setup_intent?.client_secret

      let current_period_end = ''

      if (pricePlan) {
        const pLast = await stripeService.getLastInfoPayment(ownerId, pricePlan?.id)
        current_period_end = pLast.current_period_end
      }

      const price = (pricePlan?.unit_amount / 100).toFixed(2);

      if (await testAccountIsPay(email)) {
        return {
          ownerId,
          priceId: pricePlan?.id || '',
          price: price,
          period: pricePlan?.recurring.interval,
          type: profile.type,
          subscriptionId: subscription?.id,
          email,
          firstName,
          picture,
          clientSecret,
          subscriptionIsActive,
          unreadNotifications: 3,
          totalDiskSpace: countSizes || 0,
          availableDiskSpace: size || 0,
        };
      }

      const isSuccessSignUp = await isSignUp(ownerId, email);

      if (!isSuccessSignUp) { // not verify email
        return {
          code: 1010,
          ownerId,
          email
        }
      }

      if (profile.status == 400) {
        return {
          code: 1008,
          clientSecret,
          ownerId,
          priceId: pricePlan?.id || '',
          price: price,
          period: pricePlan?.recurring.interval,
          type: profile.type
        }
      }

      if (code) { // 1007
        return {
          code,
          ownerId,
          email
        }
      }

      if (current_period_end) {
        const success_active = current_period_end <= new Date;

        if (success_active) {
          await createErrorMessage(ownerId, 'Error subscription ended, pay for it')

          return {
            message: "Subscription expired",
            clientSecret,
            ownerId,
            priceId: pricePlan?.id || '',
            price: price,
            period: pricePlan?.recurring?.interval,
            type: profile.type
          }
        }
      }

      const result = await getInfoStatusPayment(ownerId, status_invent) // 1001

      if (result.code) {
        return {
          code: result.code,
          clientSecret,
          ownerId,
          priceId: pricePlan?.id || '',
          price: price,
          period: pricePlan?.recurring.interval,
          type: profile.type
        }
      }

      return {
        ownerId,
        priceId: pricePlan?.id || '',
        price: price,
        period: pricePlan?.recurring?.interval,
        type: profile.type,
        subscriptionId: subscription?.id || "",
        email,
        firstName,
        picture,
        clientSecret,
        subscriptionIsActive,
        unreadNotifications: 3,
        totalDiskSpace: countSizes || 0,
        availableDiskSpace: size
      };
    } catch (error) {
      if (error.message.search('No such subscription') != -1) {
        return {
          message: "Subscription expired",
          // clientSecret,
          ownerId,
        }
      }
      return {
        code: error.message
      }
    }
  }
}

module.exports = {
  registration,
  signIn,
  recover,
  reset,
  sendLink,
  isValidToken,
  createPaymentMethod,
  getInfoStatusPayment,
  createSession,
  updateSessionUser,
  infoUser,
  upsertGoogleRegister,
  upsertFacabookRegister,
  getMembers,
  getAllPayment,
  signInSocialNetwork,
  isLoggedIn
};
