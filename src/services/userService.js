const { User } = require('../models/userModel');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { deleteFile } = require('./fileService');
const bcrypt = require('bcrypt');
const { PaymentCard } = require('../models/userPaymentCardModel');
const { OnBoard } = require('../models/onboardModel');
const { VerifyEmail } = require('../models/verifyEmailModel');
const { TestAccount } = require('../models/testAccountModel');

/**
 * Set user image
 * @param {number} ownerId 
 * @param {string} location 
 * @returns 
 */
const setUserImage = async (ownerId, location) => {
  const user = await User.findOne({ where: { id: ownerId } });
  if (!user) {
    throw new NotFoundError(`Not found user with this ID: ${ownerId}`, ownerId);
  }

  if (user.picture) {
    const key = user.picture.split('/').pop();
    await deleteFile(key);
  }
  await user.update({ picture: location });

  return { picture: location };
};

const getUser = async (ownerId) => {
  const user = await User.findOne({ where: { id: ownerId } });
  if (!user) {
    throw new NotFoundError(`Not found user with this ID: ${ownerId}`, ownerId);
  }
  return user
}

const updateUser = async (ownerId, firstName, lastName, company, showDocument, showCampaign) => {
  const user = await User.findOne({ where: { id: ownerId } });
  if (!user) {
    throw new NotFoundError(`Not found user with this ID: ${ownerId}`, ownerId);
  }

  if (firstName) {
    await user.update({ firstName });
  }
  if (lastName) {
    await user.update({ lastName });
  }
  if (company) {
    await user.update({ organization: company });
  }

  if (showDocument) {
    await user.update({ showDocument });
  }
  if (showCampaign) {
    await user.update({ showCampaign });
  }

  return user
}

const getUserByEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new NotFoundError(`Not found user with this email: ${email}`, email);
  }
  return user
}

const changePassword = async (id, password) => {
  const user = await getUser(id);
  await user.update({
    password: await bcrypt.hash(password, 10),
  });
  return {
    message: 'success'
  }
}

const createCard = async (ownerId, card, expDate, cardholdersName) => {
  PaymentCard.create({
    ownerId,
    card: await bcrypt.hash(card, 10),
    lastFourCard: card.slice(-4),
    expDate,
    cardholdersName,
  })
  return {
    message: 'success'
  }
}

const getCard = async (ownerId) => {
  return PaymentCard.findOne({
    where: {
      ownerId
    },
    order: [['createdAt', 'DESC']],
  })
}

const generateCode = async () => {
  let codeNumber = "";
  const possible = "0123456789";

  for (var i = 0; i <= 5; i++)
    codeNumber += possible.charAt(Math.floor(Math.random() * possible.length));

  return codeNumber;
}

const verifyCodeSignUpSW = async (ownerId, email) => {
  const code = await generateCode()
  await saveVerifyCode(ownerId, email, code, 'SignUp')
  await verifyCodeSignUp(ownerId, email, code)
}

const verifyCodeSignIn = async (ownerId, email, code) => {
  const verifyCode = await VerifyEmail.findOne({
    where: {
      ownerId, email, code, type: "SignIn", success: false
    },
    order: [['updatedAt', 'DESC']],
  });
  if (!verifyCode) {
    return {
      status: 400,
      message: 'Error: Code not found'
    }
  }

  const nowDate = new Date()

  const difference = nowDate.getTime() - verifyCode.updatedAt.getTime();
  const minetes = Math.round(difference / 60000);

  if (minetes >= 15) {
    return {
      status: 400,
      message: 'Error: Code expired'
    }
  }

  await verifyCode.update({ success: true })

  return {
    status: 200,
    message: 'ok'
  }
}

const verifyCodeSignUp = async (ownerId, email, code) => {
  const verifyCode = await VerifyEmail.findOne({
    where: {
      ownerId, email, code, type: "SignUp", success: false
    },
    order: [['updatedAt', 'DESC']],
  });
  if (!verifyCode) {
    return {
      status: 400,
      message: 'Error: Code not found'
    }
  }
  const nowDate = new Date()

  const difference = nowDate.getTime() - verifyCode.updatedAt.getTime();
  const minetes = Math.round(difference / 60000);

  if (minetes >= 15) {
    return {
      status: 400,
      message: 'Error: Code expired'
    }
  }

  await verifyCode.update({ success: true })

  const codeSignIn = '123456';
  await saveVerifyCode(ownerId, email, codeSignIn)
  await verifyCodeSignIn(ownerId, email, codeSignIn)

  return {
    status: 200,
    message: 'ok'
  }
}

const saveVerifyCode = async (ownerId, email, code, type = "SignIn") => {
  return await VerifyEmail.create({
    ownerId,
    email,
    code,
    type
  })
}

const getCodes = async () => {
  return await VerifyEmail.findAll({ })
}

const resetCodeSignIn = async (ownerId, email) => {
  const record = await VerifyEmail.findOne({
    where: {
      ownerId,
      email,
      type: "SignIn"
    },
    order: [['updatedAt', 'DESC']],
  })
  const code = await generateCode();

  if (!record) {
    return await saveVerifyCode(ownerId, email, code)
  }

  await record.update({ code })

  return record
}

const resetCodeSignUp = async (ownerId, email) => {
  let record = await VerifyEmail.findOne({
    where: {
      ownerId,
      email,
      type: "SignUp"
    },
    order: [['updatedAt', 'DESC']],
  })
  const code = await generateCode();

  if (!record) {
    return await saveVerifyCode(ownerId, email, code, 'SignUp')
  }

  await record.update({ code, success: false })

  return record
}

const isSignUp = async (ownerId, email) => {
  if (await testAccountIsVerify(email)) {
    return true
  }

  const record = await VerifyEmail.findOne({
    where: {
      ownerId,
      email,
      type: "SignUp"
    },
    order: [['updatedAt', 'DESC']],
  })

  if (!record) {
    return false
  }
  return record.success;
}

const isSignIn = async (ownerId, email) => {
  if (await testAccountIsVerify(email)) {
    return true
  }

  const record = await VerifyEmail.findOne({
    where: {
      ownerId,
      email,
      type: "SignIn"
    },
    order: [['updatedAt', 'DESC']],
  })

  if (!record) {
    return false
  }
  return record.success;
}

const updateOnBoard = async (ownerId, forService, primary, companySize, role, option) => {
  const record = await OnBoard.findOne({
    where: {
      ownerId
    },
    order: [['updatedAt', 'DESC']],
  })
  if (!record) {
    const result = await OnBoard.create({
      ownerId, forService, primary, companySize, role, option
    })
    return {
      status: 200,
      ...result
    }
  }

  await record.update({ forService, primary, companySize, role, option })

  const { ...result } = record.toJSON()

  return {
    status: 200,
    ...result
  }
}

const getOnBoard = async (ownerId) => {
  const record = await OnBoard.findOne({
    where: {
      ownerId
    },
    order: [['updatedAt', 'DESC']],
  })
  // if (!record) {
  //   return {
  //     status: 400,
  //     message: 'Error: Not found record'
  //   }
  // }
  return record
}

const createTestAccount = async (ownerId, email, isVerification, isLimits, isPay) => {
  try {
    return await TestAccount.create({ ownerId, email, isVerification, isLimits, isPay })
  } catch (error) {
    throw new ValidationError(error.errors[0].message);
  }
}

const updateTestAccount = async (email, isVerification, isLimits, isPay) => {
  try {
    const record = await TestAccount.findOne({
      where: {
        email
      },
    })
    if (!record) {
      throw new ValidationError('Not found email')
    }
    const data = {}
 
    if (isVerification != undefined) {
      data['isVerification'] = isVerification
    }
    if (isLimits != undefined) {
      data['isLimits'] = isLimits
    }
    if (isPay != undefined) {
      data['isPay'] = isPay
    }
 
    return await record.update(data)
  } catch (error) {
    throw new ValidationError(error.message)
  }
}

const deleteTestAccount = async (email) => {
  try {
    const record = await TestAccount.findOne({
      where: {
        email
      },
    })
    if (!record) {
      throw new ValidationError('Not found email')
    }
    return await record.destroy()
  } catch (error) {
    throw new ValidationError(error.message)
  }
}

const testAccountIsPay = async (email) => {
  try {
    const record = await TestAccount.findOne({
      where: {
        email
      },
    })

    return record?.isPay
  } catch (error) {
    throw new ValidationError(error.message)
  }
}

const testAccountIsVerify = async (email) => {
  const check = await TestAccount.findOne({
    where: {
      email
    }
  })

  if (check && check?.isVerification) {
    return check?.isVerification
  }

  return false
}

const testAccountIsLimits = async (email) => {
  const check = await TestAccount.findOne({
    where: {
      email
    }
  })

  if (check && check?.isLimits) {
    return check?.isLimits
  }

  return false
}

module.exports = {
  setUserImage,
  getUser,
  getUserByEmail,
  updateUser,
  changePassword,
  createCard,
  getCard,
  generateCode,
  updateOnBoard,
  getOnBoard,
  saveVerifyCode,
  verifyCodeSignIn,
  resetCodeSignIn,
  verifyCodeSignUp,
  resetCodeSignUp,
  isSignUp,
  verifyCodeSignUpSW,
  isSignIn,
  createTestAccount,
  updateTestAccount,
  deleteTestAccount,
  testAccountIsPay,
  testAccountIsVerify,
  testAccountIsLimits,
  getCodes
}; 