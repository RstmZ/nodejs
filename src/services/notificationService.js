const { Op } = require('sequelize');
const { Notification } = require('../models/notificationModel');
const { NotFoundError, AppError } = require('../utils/errors');

/**
 *  Get notification with filter and sort 
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} type 
 * @param {string} search 
 * @returns 
 */
const getNotifications = async (ownerId, page, limit, sort, param, type, search) => {
  const searchParams = {
    where: {
      // [Op.and]: [{
      //   [Op.or]: [
      //     { ownerId: ownerId },
      //     { ownerId: null }],
      // }],
    },
    attributes: { exclude: ['ownerId'] },
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
  };

  if (type) {
    searchParams.where.type = type;
  }

  if (search) {
    searchParams.where[Op.and].push({
      [Op.or]: [
        { title: { [Op.iRegexp]: search } },
        { text: { [Op.iRegexp]: search } },
      ],
    });
  }

  try {
    const notifications = await Notification.findAll(searchParams);
    if (notifications.length === 0) throw new NotFoundError('Notifications not found', ownerId);

    return notifications;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Get notification By Id
 * @param {number} notificationId 
 * @returns 
 */
const getNotificationsById = async (notificationId) => {
  try {
    const notification = await Notification.findOne({ where: { id: notificationId } });

    if (!notification) throw new NotFoundError(`Not found notification with ID: ${notificationId}`);

    return notification;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Create notification 
 * @param {number} ownerId 
 * @param {string} type 
 * @param {string} title 
 * @param {string} text 
 * @param {string} additionalData 
 * @param {string} subtitle 
 * @returns 
 */
const createNotification = async (ownerId, type, title, text, additionalData, subtitle) => {
  const newNotification = await Notification.create({
    ownerId, type, title, text, additionalData, subtitle
  });

  return newNotification;
};

/**
 * Update notification
 * @param {number} notificationId 
 * @param {number} ownerId 
 * @param {string} type 
 * @param {string} title 
 * @param {string} text 
 * @param {string} additionalData 
 * @param {string} subtitle  
 * @returns 
 */
const updateNotification = async (notificationId, ownerId, type, title, text, additionalData, subtitle) => {
  const updatedNotification = await Notification.findOne({ where: { id: notificationId, ownerId }});

  if (!updatedNotification) throw new NotFoundError(`Not found notification with ID: ${notificationId}`, ownerId);

  await updatedNotification.update({
    ownerId, type, title, text, additionalData, subtitle
  });

  return updatedNotification;
};

/**
 * Delete notification
 * @param {number} notificationId 
 * @returns 
 */
const deleteNotification = async (notificationId) => {
  const deletedNotification = await Notification.findOne({ where: { id: notificationId } });

  if (!deletedNotification) throw new NotFoundError(`Not found notification with ID: ${notificationId}`);

  await deletedNotification.destroy();

  return { message: 'Notification deleted.' };
};

module.exports = {
  getNotifications,
  getNotificationsById,
  createNotification,
  updateNotification,
  deleteNotification,
};
