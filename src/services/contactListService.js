const { Op } = require('sequelize');
const flatten = require('lodash.flatten');
const uniqby = require('lodash.uniqby');
const { Campaign } = require('../models/campaignModel');
const { CampaignToContactList } = require('../models/campaignToContactListModel');
const { ContactList } = require('../models/contactListModel');
const { Contact } = require('../models/contactModel');
const { NotFoundError, AppError } = require('../utils/errors');
const { ContactStatus } = require('../models/contactStatusModel');
const { ContactNote } = require('../models/contactNoteModel');
const { Subject } = require('../models/subjectModel');
const { ContactListToContact } = require('../models/contactListToContactModel');
const { createErrorMessage } = require('./errorMessageService');

/**
 * Get campaign with filter and sort
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getContactLists = async (ownerId, page, limit, sort, param, search) => {
  const searchParams = {
    where: {
      ownerId,
    },
    include: [
      {
        model: Contact,
        attributes: ['id'],
        through: { attributes: [] },
      },
      {
        model: Campaign,
        attributes: ['id', 'title'],
        through: { attributes: [] },
      },
    ],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    distinct: true,
  };

  if (search) {
    searchParams.where[Op.or] = [
      { title: { [Op.iRegexp]: search } },
      { description: { [Op.iRegexp]: search } },
    ];
  }

  try {
    const contactList = await ContactList.findAndCountAll(searchParams);

    if (!contactList.count) throw new NotFoundError('No contact list found.', ownerId);

    const contactListRows = contactList.rows.map((el) => ({
      id: el.id,
      title: el.title,
      description: el.description,
      contacts: el.Contacts.length,
      createdAt: el.createdAt,
      campaigns: el.Campaigns,
    }));

    return { count: contactList.count, rows: contactListRows };
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

/**
 * 
 * @param {number} ownerId 
 * @param {*} filters 
 * @param {number} contactListId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getContactsFromList = async (
  ownerId, 
  contactListId,
  page,
  limit,
  sort,
  param,
  search,
) => {

  const searchParams = {
    where: {
      [Op.and]: [],
    },
    attributes: [
      'id',
      'avatar',
      'isPrivate',
      'firstName',
      'lastName',
      'email',
      'city',
      'country',
      'position',
      'companyName',
      'aboutContact',
      'createdAt',
      'address',
    ],
    include: [ 
      {
        model: ContactList,
        attributes: ['id', 'title', 'description'],
        through: { attributes: [] },
        where: { id: contactListId, ownerId },
        include: {
          model: Campaign,
          attributes: ['id', 'title'],
          through: { attributes: [] },
        },
      }, 
    ],
    offset: ((page - 1) * limit),
    // limit,
    order: [[sort, param]],
    // distinct: true,
  };

  const searchRoot = searchParams.where[Op.and];

  if (search) {
    const [firstName, lastName] = search.split(' ');
    if (firstName) {
      searchRoot.push({
        [Op.or]: {
          firstName: { [Op.iRegexp]: firstName },
        },
      });
      if (lastName) {
        searchRoot.push({
          [Op.or]: {
            lastName: { [Op.iRegexp]: lastName },
          },
        });
      }
    }
  }
  try {

    const contactList = await ContactList.findOne({
      where: { ownerId, id: contactListId },
    });

     
    const contacts = await Contact.findAll(searchParams);

    if (!contacts.length) throw new NotFoundError(`No contact found in Contact List with ID: ${contactListId}`, ownerId);

    const newOutputArray = contacts.map((contact) => {
      const campaigns = flatten(contact.ContactLists.map(({ Campaigns }) => Campaigns));

      const isActive = contact?.ContactStatus ? contact?.ContactStatus?.isActive : true;

      return {
        id: contact.id,
        avatar: contact.avatar,
        isActive,
        isPrivate: contact.isPrivate,
        firstName: contact.firstName,
        lastName: contact.lastName,
        city: contact.city,
        country: contact.country,
        company: contact.companyName,
        position: contact.position,
        email: contact.email,
        address: contact.address,
        aboutContact: contact.aboutContact,
        lists: contact.ContactLists.map(({ id, title }) => ({ id, title })),
        campaigns: uniqby(campaigns.map(({ id, title }) => ({ id, title })), 'id'),
        subjects: contact.Subjects,
      };
    });


    return {
      contactList,
      counts: contacts.length || 0,
      rows: newOutputArray,
    };
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

const getContactistById = async (id) => {
  const contactList = await ContactList.findOne({
    where: {
      id: id
    },
  });
  return contactList
}
/**
 * Create new contact list
 * @param {number} ownerId 
 * @param {string} title 
 * @param {string} description 
 * @param {*} contactsId 
 * @returns newContactList - new contact list
 */
const createContactList = async (ownerId, title, description, contactsId) => {
  try {
    const newContactList = await ContactList.create({
      ownerId,
      title,
      description
    });

    if (contactsId?.length === 0) {
      await newContactList.setContacts([]);
    }
    if (contactsId) {
      await newContactList.setContacts(contactsId);
    }
    return newContactList;
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

/**
 * Update contact list
 * @param {number} ownerId 
 * @param {number} contactListId 
 * @param {*} data 
 * @returns {*} constactList - updated contact list
 */
const updateContactList = async (ownerId, contactListId, data) => {
  try {
    const contactListToUpdate = await ContactList.findOne({ where: { id: contactListId, ownerId } });

    if (!contactListToUpdate) throw new NotFoundError(`Not found contact list with this ID: ${contactListId}`, ownerId);

    await contactListToUpdate.update({ ...data, contactsId: undefined });

    if (data.contactsId?.length === 0) {
      await contactListToUpdate.setContacts([]);
    } else if (data.contactsId) {
      await contactListToUpdate.setContacts(data.contactsId);
    }
    return contactListToUpdate;
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

/**
 * Delete contact list, campaign to contact list and contact list to contact
 * @param {number} ownerId 
 * @param {number} contactListId 
 * @returns 
 */
const deleteContactList = async (ownerId, contactListId) => {
  try {
    const contactList = await ContactList.findOne({ where: { id: contactListId, ownerId } });

    if (!contactList) {
      return `Not found contact list with this ID: ${contactListId}`;
    }
    await CampaignToContactList.destroy({ where: { ContactListId: contactListId } });
    await ContactListToContact.destroy({ where: { ContactListId: contactListId } });
    contactList.destroy();
    return 'ok';
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

module.exports = {
  getContactLists,
  getContactsFromList, 
  createContactList,
  updateContactList,
  deleteContactList,
  getContactistById,
};
