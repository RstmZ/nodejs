const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { notificationCreateValidator, notificationUpdateValidator } = require('../middlewares/validationMiddleware');
const {
  getNotifications,
  createNotification,
  getNotificationsById,
  updateNotification,
  deleteNotification,
} = require('../services/notificationService');
const { asyncWrapper } = require('../utils/apiUtils');

const notificationRouter = express.Router();

// Get notifications with filter and sort 
notificationRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const userId = req.session.user.id;
  const {
    page = 1, limit = 5, sort = 'createdAt', param = 'desc', type = null, search = '',
  } = req.query;
  const notifications = await getNotifications(userId, page, limit, sort, param, type, search);
  res.json(notifications);
}));

// Get notification By Id
notificationRouter.get('/:notificationId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const notification = await getNotificationsById(notificationId);
  res.json(notification);
}));

// Create notification
notificationRouter.post('/', userSessionMiddleware, notificationCreateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { type, title, text, additionalData, subtitle } = req.body;
  const newNotification = await createNotification(ownerId, type, title, text, additionalData, subtitle);
  res.json(newNotification);
}));

// Update notification by id
notificationRouter.put('/:notificationId', userSessionMiddleware, notificationUpdateValidator, asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const ownerId = req.session.user.id;
  const { type, title, text, additionalData, subtitle } = req.body;
  const updatedNotification = await updateNotification(
    notificationId, ownerId, type, title, text, additionalData, subtitle
  );
  res.json(updatedNotification);
}));

// Delete notification by id
notificationRouter.delete('/:notificationId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const deletedNotification = await deleteNotification(notificationId);
  res.json(deletedNotification);
}));

module.exports = {
  notificationRouter,
};
