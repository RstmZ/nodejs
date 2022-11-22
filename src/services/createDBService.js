const fs = require('fs');

const reader = require('xlsx');
const { Contact } = require('../models/contactModel');
const { ContactToSubjects } = require('../models/contactToSubjectsModel');
const { Subject } = require('../models/subjectModel');

const createDB = async (myFile) => {
  const file = reader.readFile(myFile.path);

  const data = [];
  const sheets = file.SheetNames;

  for (let i = 0; i < sheets.length; i++) {
    const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
    temp.forEach((res) => {
      data.push(res);
    });
  }

  data.forEach(async (value) => {
    const newContactObject = {
      ownerId: 3,
      firstName: (value['First Name'] ?? 'unknown').slice(0, 250),
      lastName: (value['Last Name'] ?? 'unknown').slice(0, 250),
      companyName: (value['Company Name'] ?? '').slice(0, 250),
      companyType: (value['Company Type'] ?? '').slice(0, 250),
      position: (value.Position ?? '').slice(0, 250),
      email: (value.Email ?? 'unknown').slice(0, 250),
      twitterUsername: (value['Twitter Username'] ?? '').slice(0, 250),
      phoneNumber: (value['Phone Number'] ?? '').slice(0, 250),
      mobilePhoneNumber: (value['Mobile Phone Number'] ?? '').slice(0, 250),
      faxNumber: (value['Fax Number'] ?? '').slice(0, 250),
      workingLanguages: (value['Working Languages'] ?? '').slice(0, 250),
      country: (value.Country ?? '').slice(0, 250),
      state: (value.State ?? '').slice(0, 250),
      city: (value.City ?? '').slice(0, 250),
      address: (value.Address ?? '').slice(0, 250),
      aboutContact: (value['About contact'] ?? '').replace(/\[CR-LF]/g, '').slice(0, 2000),
      contactOwnSubjects: (value.Subjects ?? '').slice(0, 250),
      uniqueVisitors: value['Unique Visitors'],
      audienceReach: value['Audience Reach'],
      companyCity: (value['Company City'] ?? '').slice(0, 250),
      website: (value.Website ?? '').slice(0, 250),
      aboutCompany: (value['About company'] ?? '')
        .replace('EDITORIAL PROFILE/BACKGROUND', '')
        .replace(/\[CR-LF]/g, '')
        .replace('ADVERTISING INFORMATION', '')
        .replace('OUTLET STATISTICS', '')
        .slice(0, 2000),
    };

    const contact = await Contact.create(newContactObject);

    const subjectArr = (value.Subjects ?? '').split('; ');

    subjectArr.forEach(async (subjValue) => {
      let subject = await Subject.findOne({
        where: {
          subjectText: subjValue,
        },
      });

      if (!subject) {
        subject = await Subject.create({ subjectText: subjValue });
      }

      await ContactToSubjects.create({
        ContactId: contact.id,
        SubjectId: subject.id,
        ownerId: 3,
      });
    });
  });

  fs.rmdirSync(`${__dirname}/../../uploads`, {
    recursive: true,
  }, (error) => {
    if (error) {
      console.log(error);
    }
  });
};

module.exports = {
  createDB,
};
