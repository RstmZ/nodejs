const uuid = require('uuid');
const { User } = require('../models/userModel');
const { UserTeamMember } = require('../models/userTeamMemberModel');
const { NotFoundError, AppError, ValidationError } = require('../utils/errors');
const { createErrorMessage } = require('./errorMessageService');
const { sendUserTeamInviteEmail } = require('./mailService');

/**
 * Get user team by ownerId
 * @param {number} ownerId 
 * @returns 
 */
const getUserTeam = async (ownerId) => {
  const userTeam = await UserTeamMember.findAll({
    where: { ownerId },
    attributes: ['id', 'email', 'firstName', 'status'],
  });
  if (!userTeam.length) {
    await createErrorMessage('No users in your team', ownerId);
    return []
  }

  return userTeam 
};

/**
 * Create team user
 * @param {number} userId 
 * @param {string} email 
 * @param {string} status 
 * @returns 
 */
const createUserInTeam = async (userId, email, status) => {
  const newUserInTeam = await User
    .findOne({ where: { email }, attributes: ['email', 'id', 'firstName', 'lastName'], include: [{ model: UserTeamMember }] });

  if (newUserInTeam === null) {
    throw new NotFoundError('There is no user with this email.', userId);
  }
  if (newUserInTeam.id === userId) {
    throw new AppError('You are trying to add yourself to your team.');
  }
  const isUserInTeam = await UserTeamMember
    .findOne({ where: { userId, userInTeamId: newUserInTeam.id } });
  if (isUserInTeam) {
    throw new AppError('User already is in your team.');
  }

  const addedUser = await UserTeamMember
    .create({ userId, userInTeamId: newUserInTeam.id, status });

  return {
    id: addedUser.id,
    userId: newUserInTeam.id,
    status: addedUser.status,
    name: newUserInTeam.name,
    email: newUserInTeam.email,
  };
};


const inviteUserInTeam = async (user, emailToInvite) => {
  const findUser = await User.findOne({ where: { email: emailToInvite } });

  const hash = uuid.v4();
  const inviteLink = `http://localhost:8080/user/team/invite-callback/${hash}`;

  if (findUser) {
    await sendUserTeamInviteEmail(user, findUser, inviteLink);
    await UserTeamMember.create({
      userId: user.id, userInTeamId: findUser.id, status: 'Invite Pending', hash,
    });
    const response = { user, emailToInvite };
    return response;
  } if (!findUser) {
    const newUser = await User.create({ email: emailToInvite, password: 'No_Password', subscriptionIsActive: false });
    await sendUserTeamInviteEmail(user, newUser, inviteLink);
    await UserTeamMember.create({
      userId: user.id, userInTeamId: newUser.id, status: 'Invite Pending', hash,
    });
    const response = { user, emailToInvite };
    return response;
  }
  throw new AppError('Error');
};

const inviteUserInTeamCallback = async (hash) => {
  const findRecord = await UserTeamMember.findOne({ where: { hash } });
  if (!findRecord) {
    throw new NotFoundError('Record not found!');
  }

  await findRecord.update({ status: 'Moderator', hash: null });
  return 'Ok';
};

const createUserTeam = async (ownerId, email, status = "Viewer", firstName = '') => {
  const isUserTeam = await UserTeamMember.findOne({ where: { ownerId, email: email } });
  if (isUserTeam) {
    throw new ValidationError(`User member with this email ${email} already exists.`, ownerId);
  }
  return await UserTeamMember.create({
    ownerId, email, status, firstName
  });
}

const getUserTeamByEmail = async (ownerId, email) => {
  const isUserTeam = await UserTeamMember.findOne({ where: { ownerId, email: email } });
  if (isUserTeam) {
    throw new ValidationError(`User member with this email ${email} already exists.`, ownerId);
  }
  return isUserTeam
}

/**
 * Delete member by id
 * @param {number} ownerId 
 * @param {number} id 
 * @returns 
 */
const deleteMember = async (ownerId, id, ownerEmail) => {
  const userTeam = await UserTeamMember.findOne({ where: { id: id, ownerId } });

  if (!userTeam) {
    throw new NotFoundError('There is no such user in your member.');
  }
  if(userTeam.email == ownerEmail) {
    throw new AppError('Mistake. You cannot delete yourself');
  }
  await userTeam.destroy()
  return { message: 'User deleted from member.' };
};

/**
 * Update team by id
 * @param {number} id 
 * @param {string} status 
 * @returns 
 */
const updateMember = async (id, ownerId, status) => {
  const updateUser = await UserTeamMember.findOne({ where: { id: id, ownerId } });
  if (!updateUser) {
    throw new NotFoundError('There is no such user in your member.');
  }
  if (updateUser.status === 'Admin') {
    throw new AppError(`Member status admin. Can't be changed.`);
  }

  await updateUser.update({ status });

  return updateUser;
};

module.exports = {
  getUserTeam,
  getUserTeamByEmail,
  createUserTeam,
  deleteMember,
  updateMember,
  inviteUserInTeam,
  inviteUserInTeamCallback,
};
