const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  contactListCreateValidator,
  contactListUpdateValidator,
} = require('../middlewares/validationMiddleware');
const {
  getContactLists,
  createContactList,
  updateContactList,
  getContactsFromList,
  deleteContactList, 
} = require('../services/contactListService');
const { asyncWrapper } = require('../utils/apiUtils');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const { ContactListToContact } = require('../models/contactListToContactModel');

const contactListRouter = express.Router();

// Get contact list with filter and sort
contactListRouter.get('/', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const {
    page = 1, limit = 10, sort = 'title', param = 'asc', search = '',
  } = req.query;
  const contactLists = await getContactLists(ownerId, page, limit, sort, param, search);
  res.json(contactLists);
}));

// Delete contact list by ids
contactListRouter.post('/delete', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { ids } = req.body;
  const deleted = await Promise.all(ids.map(async (contactListId) => {
    try {
      const response = await deleteContactList(ownerId, contactListId);

      return {
        msg: response,
      };
    } catch (error) {
      return error;
    }
  }));

  res.json(deleted);
}));

// Get contacts from list by contactListId with filter and sort 
contactListRouter.post('/:contactListId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { contactListId } = req.params;
  const ownerId = req.invitationUserId;
  const {
    page = 1,
    limit = 10,
    sort = 'firstName',
    param = 'asc',
    search = '',
  } = req.query; 
  const contacts = await getContactsFromList(
    ownerId, 
    contactListId,
    page,
    limit,
    sort,
    param,
    search,
  ); 
  res.json(contacts);
}));

// Delete contact by ids from contact list by id
contactListRouter.post('/:contactListId/delete', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactListId } = req.params;
  const ownerId = req.session.user.id;
  const { ids } = req.body;

  const contacts = await ContactListToContact.findAll({
    attributes: ['id', 'ContactId'],
    where: { ContactListId: contactListId },
  });
  const newIds = [];
  contacts.map(async (value) => {
    if (!ids.includes(String(value.ContactId))) {
      newIds.push(value.ContactId);
    }
  });
  const contact = await updateContactList(ownerId, contactListId, { contactsId: newIds });
  res.json(contact);
}));

// create new contact list
contactListRouter.post('/', userSessionMiddleware, contactListCreateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { title, description, contactsId } = req.body;
  const newList = await createContactList(ownerId, title, description, contactsId);
  res.json(newList);
}));

// update contact list by id 
contactListRouter.put('/:contactListId', userSessionMiddleware, contactListUpdateValidator, asyncWrapper(async (req, res) => {
  const { contactListId } = req.params;
  const ownerId = req.session.user.id;
  const updatedList = await updateContactList(ownerId, contactListId, req.body);
  res.json(updatedList);
}));

// Delete const list by id
contactListRouter.delete('/:contactListId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactListId } = req.params;
  const ownerId = req.session.user.id;
  const deleted = await deleteContactList(ownerId, contactListId);
  res.json(deleted);
}));

module.exports = {
  contactListRouter,
};
