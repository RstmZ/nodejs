const { Subject } = require('../models/subjectModel');

/**
 * Create subject
 * @param {*} subjectList - list new subjects  
 * @returns 
 */
const createSubject = async (subjectList) => {
  const newSubjectsList = subjectList.map((el) => ({ subjectText: el }));
  const response = await Subject.bulkCreate(newSubjectsList, { updateOnDuplicate: ['subjectText'] });
  return response;
};


const createSubjectById = async (id, subjectText) => { 
  const response = await Subject.create({id, subjectText})
  return response;
};


module.exports = {
  createSubject,
  createSubjectById
};
