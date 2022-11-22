const { Contact } = require('../models/contactModel');
const { ContactNote } = require('../models/contactNoteModel');
const { NotFoundError } = require('../utils/errors');

/**
 * Get contact note by ownerId and id
 * @param {number} ownerId 
 * @param {number} contactId 
 * @returns 
 */
const getContactNoteById = async (ownerId, contactId) => {
  const note = ContactNote.findOne({
    where: { ownerId, contactId },
    attributes: ['id', 'textContent'],
  });

  if (!note) throw new NotFoundError(`Note not found. Contact ID: ${contactId}`, ownerId);

  return note;
};

/**
 * Create contact note
 * @param {number} ownerId 
 * @param {number} contactId 
 * @param {string} textContent 
 * @returns 
 */
const createContactNote = async (ownerId, contactId, textContent) => {
  const contact = await Contact.findOne({ where: { id: contactId } });
  if (!contact) throw new NotFoundError(`Can't found contact with id: ${contactId}`, ownerId);

  const oldNote = await ContactNote.findOne({ where: { ownerId, contactId } });

  if (oldNote) {
    await oldNote.update({ textContent });
    return { id: oldNote.id, textContent: oldNote.textContent };
  }
  const newNote = await ContactNote.create({
    ownerId, contactId, textContent,
  });
  return { id: newNote.id, textContent: newNote.textContent };
};

/**
 * Delete contact note by contact id
 * @param {number} ownerId 
 * @param {number} contactId 
 * @returns 
 */
const deleteContactNote = async (ownerId, contactId) => {
  const noteToDelete = await ContactNote.findOne({ where: { ownerId, contactId } });

  if (!noteToDelete) throw new NotFoundError(`Note not found. Contact ID: ${contactId}`, ownerId);

  await noteToDelete.destroy();

  return { message: 'Note was deleted' };
};

module.exports = {
  getContactNoteById,
  createContactNote,
  deleteContactNote,
};
