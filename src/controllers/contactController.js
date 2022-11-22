const express = require('express');
const multer = require('multer');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');

const { contactCreateValidator, contactUpdateValidator, contactsGetValidator } = require('../middlewares/validationMiddleware');
const {
  getContacts,
  createContact,
  deleteContact,
  updateContact,
  getContactById,
  deletedContactAndSubject,
  searchContacts,
  uploadFileSubjects,
  readFile,
} = require('../services/contactService');
const { createDB } = require('../services/createDBService');
const { asyncWrapper } = require('../utils/apiUtils');
const { contactNoteRouter } = require('./contactNoteController');

const contactRouter = express.Router();
const upload = multer({ dest: 'uploads' });

// Get contacts with filter and sort 
contactRouter.post('/', userSessionMiddleware, contactsGetValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const {
    page = 1, limit = 10, sort = 'firstName', param = 'asc', search = '', name = '',
  } = req.query;
  const filters = req.body ? req.body : {};

  const contacts = await getContacts(ownerId, filters, page, limit, sort, param, search, name);
  res.json(contacts);
}));

contactRouter.post('/influencer', userSessionMiddleware, contactsGetValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const {
    page = 1, limit = 10, sort = 'firstName', param = 'asc', search = '', name = '',
  } = req.query;
  const filters = req.body ? req.body : {};

  const contacts = await getContacts(ownerId, filters, page, limit, sort, param, search, name, 'Influencer');
  res.json(contacts);
}));

contactRouter.get('/save', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const save = await uploadFileSubjects();
  res.json({ msg: "ok" });
}));

contactRouter.get('/search', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { search } = req.query;
  const response = await searchContacts(search)

  res.json(response);
}));


// Get contact By Id
contactRouter.get('/:contactId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const { contactId } = req.params;
  const contact = await getContactById(ownerId, contactId);
  res.json(contact);
}));

// Create contact
contactRouter.post('/create/', userSessionMiddleware, contactCreateValidator, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const newContact = await createContact(ownerId, req.body);
  res.json(newContact);
}));

// Update contact
contactRouter.put(
  '/:contactId',
  userSessionMiddleware,
  // contactUpdateValidator,
  asyncWrapper(async (req, res) => {
    const { contactId } = req.params;
    const ownerId = req.session.user.id;
    const updatedContact = await updateContact(ownerId, contactId, req.body);
    res.json(updatedContact);
  }),
);
// delete contact by Id and owner id
contactRouter.delete('/:contactId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactId } = req.params;
  const ownerId = req.session.user.id;
  const deleted = await deleteContact(ownerId, contactId);
  res.json(deleted);
}));

contactRouter.post('/createDB/', upload.single('filedata'), asyncWrapper(async (req, res) => {
  const fileData = req.file;

  await createDB(fileData);
  res.json('newContactDB - OK');
}));

// delete contacts by ids and owner id
contactRouter.post('/delete/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { ids } = req.body;
  const deleted = await Promise.all(ids.map(async (contactId) => {
    try {
      const response = await deletedContactAndSubject(ownerId, contactId);
      return {
        msg: response,
      };
    } catch (error) {
      return error;
    }
  }));
  res.json(deleted);
}));

contactRouter.post('/upload-file',  upload.single('file'), async (req, res) => {
  const fileData = req.file;
  if (!fileData) {
    return res.status(400).json({ message: 'error' })
  } 
  // await readFile(fileData)
  res.json({ message: 'ok' })
})

// Use contact note 
contactRouter.use('/notes', contactNoteRouter);

module.exports = {
  contactRouter,
};
