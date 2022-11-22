const flatten = require('lodash.flatten');
const uniqby = require('lodash.uniqby');
const { Op, QueryTypes } = require('sequelize');
// const util = require('util');
const { NotFoundError, AppError } = require('../utils/errors');
const { Contact } = require('../models/contactModel');
const { ContactToSubjects } = require('../models/contactToSubjectsModel');
const { Subject } = require('../models/subjectModel');
const { createSubject, createSubjectById } = require('./subjectService');
const { ContactList } = require('../models/contactListModel');
const { Campaign } = require('../models/campaignModel');
const { ContactNote } = require('../models/contactNoteModel');
const { ContactStatus } = require('../models/contactStatusModel');
const { deleteFile } = require('./fileService'); 
const Papa = require('papaparse');
const fs = require('fs')
const xlsx = require("xlsx");
const { getCampaignsByContactList, getContactListByContact } = require('./campaignService');

/**
 * Get contacts with filter and sort 
 * @param {number} ownerId 
 * @param {*} filters
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @param {*} name 
 * @returns 
 */
const getContacts = async (ownerId, filters, page, limit, sort, param, search, name, type = 'Journalist') => {
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
      'city',
      'email',
      "status",
      'state',
      'country',
      'position',
      'companyName',
      'companyType',
      'companyCity',
      'aboutCompany',
      'twitterUsername',
      'phoneNumber',
      'mobilePhoneNumber',
      'faxNumber',
      'workingLanguages',
      'address',
      'aboutContact',
      'uniqueVisitors',
      'audienceReach',
      'contactOwnSubjects',
      'createdAt',
    ],
    include: [
      {
        model: ContactList,
        as: 'ContactListFilter',
        required: false,
        association: '',
        attributes: ['id', 'title'],
        include: {
          model: Campaign,
          attributes: ['id', 'title'],
          through: { attributes: [] },
        },
      },
      // {
      //   model: ContactNote, required: false,
      // },
      // {
      //   model: Subject,
      //   as: 'SubjectFilter',
      //   required: false,
      //   attributes: ['id', 'subjectText'],
      //   through: { attributes: [] },
      // }
    ],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    distinct: true,
  };

  const searchRoot = searchParams.where[Op.and];

  searchRoot.push({
    [Op.and]: {
      type,
    },
  })

  if (!filters.isPrivate) {
    searchRoot.push({
      [Op.or]: {
        ownerId,
        isPrivate: false,
      },
    });
  } else if (filters.isPrivate === 'Public') {
    searchRoot.push({
      [Op.or]: {
        isPrivate: false,
      },
    });
  } else if (filters.isPrivate === 'Private') {
    searchRoot.push({
      [Op.and]: {
        ownerId,
      },
    });
  }

  if (search) {
    searchRoot.push({
      [Op.or]: {
        email: { [Op.iRegexp]: search },
        jobRole: { [Op.iRegexp]: search },
        status: { [Op.iRegexp]: search },
        city: { [Op.iRegexp]: search },
      },
    });
  }

  if (name) {
    const [firstName, lastName] = name.split(' ');

    if (firstName) {
      searchRoot.push({
        [Op.or]: {
          firstName: { [Op.iRegexp]: firstName },
          lastName: { [Op.iRegexp]: firstName },
          aboutContact: { [Op.iRegexp]: { [Op.all]: name.split(' ') } },
          companyType: { [Op.iRegexp]: name }
        },
      });

      const subject = await Subject.findOne({
        attributes: ['id', 'subjectText'],
        where: {
          subjectText: { [Op.iRegexp]: name }
        }
      })
      if (subject?.id) {
        const contactsSubjects = await ContactToSubjects.findAndCountAll({
          where: {
            SubjectId: subject?.id
          },
        })
        const contactsSubjectsIds = await contactsSubjects.rows.map((value) => value.ContactId)

        searchRoot.push({
          id: { [Op.in]: contactsSubjectsIds },
        });
      }

      if (lastName) {
        searchRoot.push({
          [Op.or]: {
            firstName: { [Op.iRegexp]: lastName },
            lastName: { [Op.iRegexp]: lastName },
            aboutContact: { [Op.iRegexp]: { [Op.all]: name.split(' ') } },
            companyType: { [Op.iRegexp]: name }
          },
        });
      }
    }
  }

  if (filters.listId) {
    searchRoot.push({
      id: { [Op.in]: filters.listId },
    });
  }

  if (filters.firstName) {
    searchRoot.push({
      firstName: { [Op.iRegexp]: { [Op.any]: filters.firstName } },
    });
  }
  if (filters.lastName) {
    searchRoot.push({
      lastName: { [Op.iRegexp]: { [Op.any]: filters.lastName } },
    });
  }
  if (filters.workingLanguages) {
    searchRoot.push({
      workingLanguages: { [Op.iRegexp]: { [Op.any]: filters.workingLanguages } },
    });
  }
  if (filters.company) {
    searchRoot.push({
      companyName: { [Op.iRegexp]: { [Op.any]: filters.company } },
    });
  }
  if (filters.companyType) {
    searchRoot.push({
      companyType: { [Op.iRegexp]: { [Op.any]: filters.companyType } },
    });
  }
  if (filters.position) {
    searchRoot.push({
      position: { [Op.iRegexp]: { [Op.any]: filters.position } },
    });
  }
  if (filters.city) {
    searchRoot.push({
      city: { [Op.iRegexp]: { [Op.any]: filters.city } },
    });
  }

  if (filters.subjects) {
    searchParams.include = searchParams.include || [];

    const subjects = await Subject.findAll({
      attributes: ['id', 'subjectText'],
      where: {
        subjectText: { [Op.iRegexp]: { [Op.any]: filters.subjects, } }
      }
    })
    const ids = await subjects.map((value) => value.id)

    const contactsSubjects = await ContactToSubjects.findAndCountAll({
      where: {
        SubjectId: { [Op.in]: ids }
      },
    })
    const contactsSubjectsIds = await contactsSubjects.rows.map((value) => value.ContactId)

    searchRoot.push({
      id: { [Op.in]: contactsSubjectsIds },
    });
  }

  const campaingIncludeSettings = [];

  if (filters.campaignList) {
    campaingIncludeSettings.push({
      model: Campaign,
      as: 'CampaignToContactListFilter',
      required: true,
      through: { attributes: [] },
      where: {
        title: { [Op.iRegexp]: { [Op.any]: filters.campaignList } },
      },
      attributes: [],
    });
  }

  if (filters.contactList) {
    searchParams.include = searchParams.include || [];
    searchParams.include.push({
      model: ContactList,
      as: 'ContactListFilter',
      required: true,
      through: { attributes: [] },
      where: {
        title: { [Op.iRegexp]: { [Op.any]: filters.contactList } },
      },
      attributes: ['id', 'title'],
      include: campaingIncludeSettings,
    });
  }

  if (filters.campaignList && !filters.contactList) {
    searchParams.include = searchParams.include || [];
    searchParams.include.push({
      model: ContactList,
      as: 'ContactListFilter',
      required: true,
      through: { attributes: [] },
      attributes: ['id'],
      include: campaingIncludeSettings,
    });
  }

  try {
    const { rows, count } = await Contact.findAndCountAll(searchParams);


    if (!count) throw new NotFoundError('No Contacts found', ownerId);

    const newOutputArray = await Promise.all(rows.map(async (contact) => {
      const contactToJson = contact.toJSON()
      // const contactList = await getContactListByContact(contactToJson.id)
      const campaign = await flatten(contactToJson.ContactListFilter?.map(({ Campaigns }) => Campaigns));
      const contactList = await flatten(contactToJson.ContactListFilter?.map(({id, title }) => {
     
        return  {
          id, title
        }
      }));

      // const campaign = await Promise.all(contactToJson.ContactListFilter.map(async (value) => await getCampaignsByContactList(value.id)))

      const isActive = contactToJson?.ContactStatus ? contactToJson?.ContactStatus?.isActive : true;
      delete contactToJson.ContactListFilter
      return {
        ...contactToJson,
        isActive,
        lists: contactList?.map(({ id, title }) => ({ id, title })),
        campaigns: campaign,
        subjects: contactToJson.SubjectFilter,
      }
    }));
    return {
      count: newOutputArray.length,
      countAll: count,
      rows: newOutputArray
    };
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Get contact By Id
 * @param {number} ownerId 
 * @param {number} contactId 
 * @returns 
 */
const getContactById = async (ownerId, contactId) => {
  try {
    const contact = await Contact.findOne({
      where: { [Op.or]: [{ id: contactId, ownerId }, { id: contactId, isPrivate: false }] },
      attributes: [
        'id',
        'avatar',
        'isPrivate',
        'firstName',
        'lastName',
        'email',
        'city',
        'state',
        'country',
        'position',
        'companyName',
        'companyType',
        'aboutCompany',
        'twitterUsername',
        'phoneNumber',
        'mobilePhoneNumber',
        'faxNumber',
        'workingLanguages',
        'aboutContact',
        'contactOwnSubjects',
        'uniqueVisitors',
        'audienceReach',
        'companyCity',
        'website',
        'createdAt',
        'address',
        'similarityIndex',
        'countOfRecients',
        'status',
        'type'
      ],
      include: [
        {
          model: ContactStatus,
          where: { ownerId },
          attributes: ['isActive'],
          required: false,
        },
      ],
    });
    if (!contact) throw new NotFoundError('Contact not found', ownerId);
    const contactOwnSubjects = contact.contactOwnSubjects ? contact.contactOwnSubjects.split('; ') : null;
    const contactSubject = await ContactToSubjects.findAll({ where: { ContactId: contact.id } })
    const subjectsAll = await Promise.all(contactSubject.map(async (value) => {
      return await Subject.findOne({ where: { id: value.SubjectId } })
    }));

    return {
      id: contact.id,
      ownerId: contact.ownerId,
      avatar: contact.avatar,
      isActive: contact.ContactStatus ? contact.ContactStatus.isActive : true,
      isPrivate: contact.isPrivate,
      firstName: contact.firstName,
      lastName: contact.lastName,
      website: contact.website,
      companyName: contact.companyName,
      companyType: contact.companyType,
      companyCity: contact.companyCity,
      aboutCompany: contact.aboutCompany,
      jobRole: contact.jobRole,
      position: contact.position,
      email: contact.email,
      twitterUsername: contact.twitterUsername,
      phoneNumber: contact.phoneNumber,
      mobilePhoneNumber: contact.mobilePhoneNumber,
      faxNumber: contact.faxNumber,
      workingLanguages: contact.workingLanguages,
      country: contact.country,
      state: contact.state,
      city: contact.city,
      address: contact.address,
      aboutContact: contact.aboutContact,
      contactOwnSubjects,
      createdAt: contact.createdAt,
      Subjects: subjectsAll,
      uniqueVisitors: contact.uniqueVisitors,
      audienceReach: contact.audienceReach,
      similarityIndex: contact.similarityIndex,
      countOfRecients: contact.countOfRecients,
      status: contact.status,
      type: contact.type
    };
  } catch (error) {
    throw new AppError(error.message);
  }
};
/**
 * Create contact
 * @param {number} ownerId 
 * @param {*} data 
 * @returns 
 */
const createContact = async (ownerId, data) => {
  if (data.subjects?.length > 0 && data.isPrivate === false) {
    throw new AppError('Subjects not allowed on Public Contact. Please use "contactOwnSubjects"');
  }
  try {
    // Checking user has no contact with this Email
    if (await Contact.findOne({ where: { ownerId, email: data.email } })) throw new Error('Contact with this email already exists');

    const newContactObject = {
      ownerId,
      isActive: true,
      isPrivate: false,
      ...data,
      contactOwnSubjects: '',
    };
    if (!newContactObject.isPrivate) {
      const contactOwnSubjects = data?.contactOwnSubjects ? data?.contactOwnSubjects : '';

      const result = contactOwnSubjects?.length > 0 ? contactOwnSubjects.join('; ') : contactOwnSubjects;
      newContactObject.contactOwnSubjects = result;
    }

    const newContact = await Contact.create(newContactObject);

    if (newContactObject.isActive === false) {
      await ContactStatus.create({ contactId: newContact.id, ownerId, isActive: false });
    }

    if (data.subjects) {
      try {
        const result = (await createSubject(data.subjects)).map((el) => el.id);
        result.map((value) => {
          ContactToSubjects.create({
            ownerId: newContact.ownerId, SubjectId: value, ContactId: newContact.id,
          });
        });
        return newContact;
      } catch (error) {
        newContact.destroy();
        throw new AppError(error.message);
      }
    }

    return newContact;
  } catch (error) {
    // await newContact?.destroy()
    throw new AppError(error.message);
  }
};

/**
 * Update contact
 * @param {number} ownerId 
 * @param {number} contactId 
 * @param {*} data 
 * @returns 
 */
const updateContact = async (ownerId, contactId, data) => {
  let contactToUpdate;

  try {
    contactToUpdate = await Contact.findOne({
      where: { [Op.or]: [{ id: contactId, ownerId }] },
    });
  } catch (error) {
    throw new AppError(error.message);
  }

  if (!contactToUpdate) throw new NotFoundError('Contact not found', ownerId);

  if (contactToUpdate.ownerId === ownerId) {
    const newContactObject = {
      ownerId,
      isPrivate: true,
      ...data,
    };

    if (!data?.isPrivate) {
      if (data?.contactOwnSubjects?.length === 0) {
        newContactObject.contactOwnSubjects = null;
      } else {
        newContactObject.contactOwnSubjects = data.contactOwnSubjects?.join('; ');
      }
    }
    await contactToUpdate.update(newContactObject);
  }

  if (data.isActive === false) {
    await ContactStatus.create({ contactId: contactToUpdate.id, ownerId, isActive: false });
  } else if (data.isActive === true) {
    await ContactStatus.destroy({ where: { contactId: contactToUpdate.id, ownerId } });
  }

  const res = await ContactToSubjects.findAll({
    where: { ownerId: contactToUpdate.ownerId, ContactId: contactToUpdate.id }
  });
  if (res.length > 0) {
    res.map((value) => value.destroy());
  }

  if (data.subjects) {
    try {
      const result = (await createSubject(data.subjects)).map((el) => el.id);
      result.map((value) => {
        ContactToSubjects.create({
          ownerId: contactToUpdate.ownerId, SubjectId: value, ContactId: contactToUpdate.id,
        });
      });
      return contactToUpdate;
    } catch (error) {
      // contactToUpdate.destroy()
      throw new AppError(error.message);
    }
  }

  return contactToUpdate;
};
/**
 * Delete contact by Id and owner id
 * @param {number} ownerId 
 * @param {number} contactId 
 * @returns 
 */
const deleteContact = async (ownerId, contactId) => {
  try {
    const deleted = await Contact.destroy({ where: { ownerId, id: contactId } });
    if (!deleted) {
      throw new NotFoundError(`Not found contact with this ID: ${contactId}`, ownerId);
    }
    return deleted;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Delete contact by Id and owner id and delete Contact to subjects
 * @param {number} ownerId 
 * @param {number} contactId 
 * @returns 
 */
const deletedContactAndSubject = async (ownerId, contactId) => {
  try {
    await ContactToSubjects.destroy({ where: { ContactId: contactId } });


    const deleted = await Contact.destroy({ where: { ownerId, id: contactId } });

    if (deleted === 0) {
      return `You have not rights to delete contact with id ${contactId}`;
    }
    if (!deleted) {
      throw new NotFoundError(`Not found contact with this ID: ${contactId}`, ownerId);
    }
    return 'ok';
  } catch (error) {
    throw new AppError(error.message);
  }
};

const getContactsFromCampaign = async (ownerId, campaignId) => {
  const contacts = await Contact.findAll({
    where: {
      [Op.or]: {
        ownerId,
        isPrivate: false,
      },
    },
    attributes: ['id', 'firstName', 'lastName', 'email', "companyName", "city", "status"],
    include: {
      model: ContactList,
      required: true,
      attributes: ['id', 'title'],
      through: { attributes: [] },
      include: {
        model: Campaign,
        required: true,
        where: { id: campaignId },
        attributes: ['id', 'title'],
        through: { attributes: [] },
      },
    },
  });
  return contacts;
};
/**
 * Get count contacts from Campaign by Id and ownerId
 * @param {number} ownerId 
 * @param {number} campaignId 
 * @returns 
 */
const getCountContactsFromCampaign = async (ownerId, campaignId) => {
  const contacts = await Contact.findAll({
    where: {
      [Op.or]: {
        ownerId,
        isPrivate: false,
      },
    },
    attributes: ['id', 'firstName', 'lastName', 'email'],
    include: {
      model: ContactList,
      required: true,
      attributes: ['id', 'title'],
      through: { attributes: [] },
      include: {
        model: Campaign,
        required: true,
        where: { id: campaignId },
        attributes: ['id', 'title'],
        through: { attributes: [] },
      },
    },
  });
  return { 'recipients': contacts.length };
};

const setContactImage = async (ownerId, location) => {
  // const contact = await Contact.findOne({ where: { id: ownerId } });
  // if (!contact) {
  //   throw new NotFoundError(`Not found contact with this ID: ${ownerId}`);
  // }

  // if (contact.avatar) {
  //   const key = contact.avatar.split('/').pop();
  //   await deleteFile(key);
  // }
  // await contact.update({ avatar: location });

  // const [result] = await User
  //   .update({ picture: filePath }, { where: { id: userId }, returning: true });
  // if (!result) {
  //   throw new NotFoundError(`Not found user with this ID: ${userId}`);
  // }
  return { avatar: location };
};

const searchContacts = async (search) => {

  const subject = await Subject.findAll({
    attributes: ['subjectText'],
    where: {
      subjectText: { [Op.iRegexp]: search },
    }
  })

  const companyType = await Contact.findAll({
    attributes: ['companyType'],
    where: {
      companyType: { [Op.iRegexp]: search },
    }
  })

  const position = await Contact.findAll({
    attributes: ['position'],
    where: {
      position: { [Op.iRegexp]: search },
    }
  })

  const city = await Contact.findAll({
    attributes: ['city'],
    where: {
      city: { [Op.iRegexp]: search },
    }
  })

  const contactList = await ContactList.findAll({
    attributes: ['title'],
    where: {
      title: { [Op.iRegexp]: search },
    }
  })

  const contactLanguage = await Contact.findAll({
    attributes: ['workingLanguages'],
    where: {
      workingLanguages: { [Op.iRegexp]: search },
    }
  })

  const campaigns = await Campaign.findAll({
    attributes: ['title'],
    where: {
      title: { [Op.iRegexp]: search },
    }
  })

  return {
    subject: [...new Set(subject.map((item) => item.subjectText))],
    companyType: [...new Set(companyType.map((item) => item.companyType))],
    position: [...new Set(position.map((item) => item.position))],
    city: [...new Set(city.map((item) => item.city))],
    contactList: [...new Set(contactList.map((item) => item.title))],
    contactLanguage: [...new Set(contactLanguage.map((item) => item.workingLanguages))],
    campaigns: [...new Set(campaigns.map((item) => item.title))]
  }
}

const uploadFileSubjects = async () => {
  // const array = await readCSV('Subjects.csv')
  // for (let index = 0; index < array.length; index++) {
  //   const element = array[index];
  //   console.log('element', element);
  //   const res = await createSubjectById(element.id, element.subjectText)
  //   console.log('res', res);
  // }
  const workbook = xlsx.readFile('ContactToSubjects_New.xlsx');
  const sheetNames = workbook.SheetNames;

  // Get the data of "Sheet1"
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]])

  /// Do what you need with the received data
  await Promise.all(data.map(async (elem) => {
    const conToSubjects = await ContactToSubjects.create({
      ContactId: elem.ContactId,
      SubjectId: elem.SubjectId,
      ownerId: elem.ownerId,
    });
  }))
}

const readCSV = async (filePath) => {
  const csvFile = fs.readFileSync(filePath)
  const csvData = csvFile.toString()
  return new Promise(resolve => {
    Papa.parse(csvData, {
      header: true,
      transformHeader: header => header.trim(),
      complete: results => {
        console.log('Complete', results.data.length, 'records.');
        resolve(results.data);
      }
    });
  });
};

const readFile = async (myFile) => {
  const workbook = xlsx.readFile(myFile.path);
  const sheetNames = workbook.SheetNames;

  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]])
  let i = 0;

  for (let ind = 0; ind <= data.length; ind++) {
    const { contactOwnSubjects, ...obj } = data[ind];
    obj.subjects = contactOwnSubjects ? [contactOwnSubjects] : [];
    obj.type = 'Influencer';
    obj.position = 'Influencer, Blogger';
    obj.uniqueVisitors = obj.uniqueVisitor;
    obj.companyType = contactOwnSubjects ? contactOwnSubjects : '';
    try {
      await createContact(3, obj)
      console.log(i);
      i++;
    } catch (error) {
      console.log('er', i, obj.email);
      i++;
    }
  }
}

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactsFromCampaign,
  getCountContactsFromCampaign,
  setContactImage,
  deletedContactAndSubject,
  searchContacts,
  uploadFileSubjects,
  readFile
};
