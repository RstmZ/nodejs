const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  getContactNoteById, createContactNote, deleteContactNote,
} = require('../services/contactNoteService');

const { asyncWrapper } = require('../utils/apiUtils');

const contactNoteRouter = express.Router();

// Get contact note by ownerId and id
contactNoteRouter.get('/:contactId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactId } = req.params;
  const ownerId = req.session.user.id;
  const note = await getContactNoteById(ownerId, contactId);

  res.json(note);
}));

// Create contact note by contact id
contactNoteRouter.post('/:contactId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactId } = req.params;
  const { textContent } = req.body;
  const ownerId = req.session.user.id;
  const newNote = await createContactNote(ownerId, contactId, textContent);
  res.json(newNote);
}));

// Delete contact note by contact id
contactNoteRouter.delete('/:contactId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { contactId } = req.params;
  const ownerId = req.session.user.id;
  const newFaq = await deleteContactNote(ownerId, contactId);
  res.json(newFaq);
}));

module.exports = {
  contactNoteRouter,
};
