const uuid = require('uuid');
const { Op, Sequelize } = require('sequelize');
const path = require('path');
const unirest = require('unirest');
const { clientS3 } = require('../awsConnection');
const logger = require('../winston');
const { File } = require('../models/fileModel');
const { AppError, NotFoundError } = require('../utils/errors');
const { Pitch } = require('../models/pitchModel');
const { Campaign } = require('../models/campaignModel');
const { parseTextForPreview } = require('../utils/parseTextForPreview');
const { getLastPayment } = require('./paypalService');
const { getProfile } = require('./profileService');
const { parseText, deleteHtmlFromText } = require('../utils/parseText');
const { updateCurrentDocuments, updateCurrentDocumentsByOwnerId } = require('./paymentService');

const { SERVICE_API_HOST } = process.env;

/**
 * Get signed url by S3
 * @param {string} filePath 
 * @returns 
 */
const getSignedUrl = (filePath) => {
  try {
    return clientS3.getSignedUrl('getObject', { Key: filePath, Expires: 3600 * 24 * 2 });
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Read file from S3 by key
 * @param {string} filePath 
 * @returns 
 */
const readFile = async (filePath) => {
  try {
    const response = await clientS3.getObject({ Key: filePath }).promise();
    return response.Body;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Create recorgnized file and upload to S3
 * @param {string} textString 
 * @returns 
 */
const createRecognizedTextFile = async (textString) => {
  const params = {
    Key: `${uuid.v4()}${uuid.v4()}.txt`,
    Body: textString,
  };

  try {
    const newFile = await clientS3.upload(params).promise();
    return newFile.Key;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Update recorgnized text file and upload to S3
 * @param {string} key 
 * @param {string} textString 
 * @returns 
 */
const updateRecognizedTextFile = async (key, textString) => {
  const params = {
    Key: key,
    Body: textString,
  };

  try {
    await clientS3.upload(params).promise();
    return true;
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Delete file in S3
 * @param {string} filePath 
 * @returns 
 */
const deleteFile = async (filePath) => {
  try {
    await clientS3.deleteObject({ Key: filePath }).promise();
    return { message: 'File was deleted!' };
  } catch (error) {
    throw new AppError(error.message);
  }
};

/**
 * Detele file by id and owner id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @returns 
 */
const deleteFileRecord = async (ownerId, fileId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}`, ownerId);
  }
  // if (file.key) {
  //   await deleteFile(file.key);
  // }
  // if (file.recognizedTextPath) {
  //   await deleteFile(file.recognizedTextPath);
  // }
  file.destroy();
  return file;
};

/**
 * Create file 
 * @param {number} ownerId 
 * @param {string} originalName 
 * @param {number} size 
 * @param {string} key 
 * @param {string} location 
 * @param {string} type 
 * @param {number} length 
 * @returns 
 */
const createFileRecord = async (ownerId, originalName, size, key, location, type, length) => {
  const newFile = await File.create({
    ownerId, fileName: originalName, key, fileSource: location, size, length, fileType: type,
  });
  return {
    id: newFile.id, name: newFile.fileName, size: newFile.size, length: newFile.length,
  };
};

/**
 * Create file with content
 * @param {number} ownerId 
 * @param {*} data 
 * @returns 
 */
const createFileWithContent = async (ownerId, data) => {
  const fileType = data.fileType ? data.fileType : 'note';
  const content = await parseText(data?.content);

  const newFile = await File.create({
    ownerId,
    textTitle: data.textTitle,
    fileType,
    recognizedTextPreview: data.recognizedTextPreview,
    fileSource: data.fileSource,
    tonality: data.tonality,
  });

  if (content) {
    try {
      const newFilePath = await createRecognizedTextFile(content);

      await newFile.update({ recognizedTextPath: newFilePath });
    } catch (error) {
      await deleteFileRecord(ownerId, newFile.id);
      throw new AppError('Error creating message');
    }
  }

  return {
    id: newFile.id,
    textTitle: newFile.textTitle,
    fileType: newFile.fileType,
    recognizedTextPreview: newFile.recognizedTextPreview,
    content: content,
  };
};

/**
 * Create file with type 'document' 
 * @param {number} ownerId 
 * @param {string} content 
 * @param {string} title 
 * @param {string} writingStyle 
 * @returns 
 */
const createDocument = async (ownerId, content, title, writingStyle, paymentLastId) => {

  const preview = parseTextForPreview(content);
  const newFilePath = await createRecognizedTextFile(content);

  const wordsCount = content
    .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
    .replace(/\s{2,}/, ' ')
    .split(' ')
    .length;

  const symbolsCount = content
    .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
    .replace(/\s{2,}/, ' ')
    .length;

  const newFile = await File.create({
    ownerId,
    textTitle: title,
    fileType: 'document',
    recognizedTextPreview: preview,
    writingStyle,
    recognizedTextPath: newFilePath,
    words: wordsCount,
    length: symbolsCount,
  });

  if (paymentLastId) {
    await updateCurrentDocuments(paymentLastId)
  } else {
    await updateCurrentDocumentsByOwnerId(ownerId)
  }

  return { document: newFile, content, status: 200 };
};

/**
 * Generate document with Python Api
 * @param {string} summary 
 * @param {string} writingStyle 
 * @returns 
 */
const generateDocument = async (summary, writingStyle) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/generate_article/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field({ summary, writing_style: writingStyle });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  // const preview = parseTextForPreview(response.article_list[0]);
  // const newFilePath = await createRecognizedTextFile(response.article_list[0]);

  // const wordsCount = response.article_list[0]
  //   .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
  //   .replace(/\s{2,}/, ' ')
  //   .split(' ')
  //   .length;

  // const symbolsCount = response.article_list[0]
  //   .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
  //   .replace(/\s{2,}/, ' ')
  //   .length;

  // const newFile = await File.create({
  //   ownerId,
  //   textTitle: title,
  //   fileType: 'document',
  //   recognizedTextPreview: preview,
  //   // fileSource: data.fileSource,
  //   writingStyle,
  //   recognizedTextPath: newFilePath,
  //   words: wordsCount,
  //   length: symbolsCount,
  //   // size
  // });

  // return { document: newFile, content: response };

  return { ...response, writingStyle };
};

/**
 * Generate rewriting with Python Api
 * @param {string} summary 
 * @param {string} writingStyle 
 * @returns 
 */
const generateRewriting = async (summary, writingStyle) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/generate_article/rewriting/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field({ summary, writing_style: writingStyle });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return { ...response, writingStyle };
};

/**
 * Generate continuation with Python Api
 * @param {string} summary 
 * @param {string} writingStyle 
 * @returns 
 */
const generateContinuation = async (summary, writingStyle) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/generate_article/continuation/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field({ summary, writing_style: writingStyle });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return { ...response, writingStyle };
};

/**
 * Generate title with Python Api
 * @param {string} text  
 * @returns 
 */
const generateTitle = async (text) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/title_generation_v2/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('text', parseText(text));

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return response;
};

/**
 * Get files with type 'audio'
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getAudio = async (ownerId, page, limit, sort, param, search) => {
  (await File
    .findAll({
      where: {
        ownerId,
        fileType: 'audio',
        status: 'Draft',
      },
    }))
    .forEach(async (file) => {
      if (file.recognizedTextPath) {
        const uni = unirest('POST', `${SERVICE_API_HOST}/speech_by_job_id/`);

        uni.headers({
          'content-type': 'multipart/form-data',
        });

        uni.field('job_id', file.recognizedTextPath);

        uni.auth({
          user: 'prai',
          pass: 'praiapp',
          sendImmediately: true,
        });

        const response = await uni.then((res) => {
          if (res.error) throw new AppError(res.error.message);
          return res.body;
        });

        if (response.message === 'Ok') {
          const recognizedFileKey = await createRecognizedTextFile(response.text_interviewee);
          const wordsCount = response.text_interviewee
            .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
            .replace(/\s{2,}/, ' ')
            .split(' ')
            .length;

          const data = {
            recognizedTextPath: recognizedFileKey,
            words: wordsCount,
            status: 'Completed',
          };

          await file.update(data);

          if (response.message === 'Failed') {
            await file.update({ status: 'Failed' });
          }
        }
      }
    });

  const audios = await File.findAndCountAll({
    where: {
      ownerId,
      fileType: 'audio',
      [Op.or]:
        [{ fileName: { [Op.iRegexp]: search } },
        { description: { [Op.iRegexp]: search } }],
    },
    attributes: [
      'id',
      'fileName',
      'textTitle',
      'status',
      'description',
      'size',
      'length',
      'words',
      'key',
      'createdAt',
    ],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    distinct: true,
  });
  if (!audios.count) {
    throw new NotFoundError('No audios found', ownerId);
  }

  const newAudioArray = audios.rows.map((audio) => ({
    id: audio.id,
    fileName: audio.fileName,
    textTitle: audio.textTitle,
    status: audio.status,
    description: audio.description,
    size: audio.size,
    length: audio.length,
    words: audio.words,
    audioLink: getSignedUrl(audio.key),
    createdAt: audio.createdAt,
  }));

  return { count: audios.count, rows: newAudioArray };
};

/**
 * Get files  with type 'note' and with filter and sort
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getMessage = async (ownerId, page, limit, sort, param, search) => {
  const searchParams = {
    where: {
      ownerId,
      fileType: {
        [Sequelize.Op.in]: ['note', 'audio', 'document']
      },
    },
    attributes: ['id', 'textTitle', 'recognizedTextPreview', 'createdAt', 'tonality'],
    include: [
      {
        model: Pitch, as: 'PreliminaryStory', attributes: ['id'], include: { model: Campaign, attributes: ['title'] },
      }, {
        model: Pitch, as: 'KeyStory', attributes: ['id'], include: { model: Campaign, attributes: ['title'] },
      },
    ],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    distinct: true,
  };

  if (search) {
    searchParams.where[Op.or] = [
      { textTitle: { [Op.iRegexp]: search } },
      { recognizedTextPreview: { [Op.iRegexp]: search } },
    ];
  }

  const files = await File.findAndCountAll(searchParams);

  if (!files.count) {
    throw new NotFoundError('No files found', ownerId);
  }

  // TODO
  const newFilesArray = [];

  for (let i = 0; i < files.rows.length; i += 1) {
    const tempFileArray = [];
    files.rows[i].KeyStory.forEach((el) => {
      el.Campaigns.forEach((elem) => {
        // Repeating titles filtering
        // !tempFileArray.includes(elem.title) ? tempFileArray.push(elem.title) : '';
        tempFileArray.push(elem.title);
      });
    });
    files.rows[i].PreliminaryStory.forEach((el) => {
      el.Campaigns.forEach((elem) => {
        // Repeating titles filtering
        // !tempFileArray.includes(elem.title) ? tempFileArray.push(elem.title) : '';
        tempFileArray.push(elem.title);
      });
    });

    newFilesArray.push({
      id: files.rows[i].id,
      textTitle: files.rows[i].textTitle,
      recognizedTextPreview: files.rows[i].recognizedTextPreview,
      campaignTitles: [...tempFileArray],
      createdAt: files.rows[i].createdAt,
      tonality: files.rows[i].tonality,
    });
  }
  return { count: files.count, rows: newFilesArray };
};

/**
 * Get files with type 'document' with filter and sort
 * @param {number} ownerId 
 * @param {number} page 
 * @param {number} limit 
 * @param {string} sort 
 * @param {string} param 
 * @param {string} search 
 * @returns 
 */
const getDocument = async (ownerId, page, limit, sort, param, search) => {
  const documents = await File.findAndCountAll({
    where: {
      ownerId,
      fileType: 'document',
      [Op.or]:
        [
          { fileName: { [Op.iRegexp]: search } },
          { textTitle: { [Op.iRegexp]: search } },
        ],
    },
    attributes: [
      'id',
      'fileName',
      'textTitle',
      'status',
      'description',
      'size',
      'length',
      'words',
      'key',
      'tonality',
      'createdAt',
      'writingStyle',
      'fileType'
    ],
    offset: ((page - 1) * limit),
    limit,
    order: [[sort, param]],
    distinct: true,
  });

  if (!documents.count) {
    throw new NotFoundError('No documents found', ownerId);
  }

  return documents;
};

/**
 * Get file by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @returns 
 */
const getFileById = async (ownerId, fileId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}.`, ownerId);
  }
  return file;
};

const getImage = async (ownerId, fileId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) {
    return ''
  }

  return file.key ? getSignedUrl(file.key) : ''
}

/**
 * Get file audio by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @returns 
 */
const getAudioWithContentById = async (ownerId, fileId) => {
  const file = await getFileById(ownerId, fileId);

  let content = '';

  if (file.recognizedTextPath && Boolean(path.extname(file.recognizedTextPath))) {
    content = (await readFile(file.recognizedTextPath)).toString('utf-8');
  }

  return {
    id: file.id,
    fileName: file.fileName,
    status: file.status,
    length: file.length,
    textTitle: file.textTitle,
    description: file.description,
    source: getSignedUrl(file.key),
    content,
    tonality: file.tonality,
  };
};

const getMessageWithContentById = async (ownerId, fileId) => {
  const file = await getFileById(ownerId, fileId);
  let content = '';

  if (file.recognizedTextPath && Boolean(path.extname(file.recognizedTextPath))) {
    content = (await readFile(file.recognizedTextPath)).toString('utf-8');
  }

  return {
    id: file.id,
    textTitle: file.textTitle,
    content,
    tonality: file.tonality,
  };
};

/**
 * Get file with content by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @returns 
 */
const getFileWithContentById = async (ownerId, fileId) => {
  const file = await getFileById(ownerId, fileId);

  let content = '';

  if (file.recognizedTextPath) {
    content = (await readFile(file.recognizedTextPath)).toString('utf-8');
  }

  return {
    id: file.id,
    textTitle: file.textTitle,
    fileSource: file.fileSource,
    content,
    tonality: file.tonality,
  };
};

/**
 * Update file by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {*} data 
 * @returns 
 */
const updateFileWithContent = async (ownerId, fileId, data) => {
  const file = await File.findOne(
    {
      where: { id: fileId, ownerId },
      attributes: ['id', 'fileName', 'textTitle', 'description', 'recognizedTextPath', 'size', 'tonality'],
    },
  );
  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}.`);
  }

  if (file.recognizedTextPath && data.content) {
    await updateRecognizedTextFile(file.recognizedTextPath, data.content);
  }

  await file.update({
    fileName: data.fileName,
    textTitle: data.textTitle,
    description: data.description,
    recognizedTextPreview: data.recognizedTextPreview,
    tonality: data.tonality,
  });

  return {
    id: file.id,
    fileName: file.fileName,
    textTitle: file.textTitle,
    description: file.description,
    recognizedTextPreview: file.recognizedTextPreview,
    tonality: file.tonality,
    content: data.content,
  };
};

/**
 * Update file by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {*} data 
 * @returns 
 */
const updateFileRecord = async (ownerId, fileId, data) => {
  const file = await File.findOne({ where: { ownerId, id: fileId } });
  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}.`, ownerId);
  }

  try {
    if (data?.recognizedTextPath
      && file.recognizedTextPath) {
      await deleteFile(file.recognizedTextPath);
    }
  } catch (error) {
    logger.error(`Updating file record failed with: ${error.message}`);
  }
  await file.update(data, { where: { ownerId, id: fileId }, returning: true, attributes: { exclude: ['fileSource', 'recognizedTextPath', 'ownerId'] } });

  return file;
};

const getAudioFileRecordByApiId = async (sendedFileId) => {
  const audioFileRecord = await File.findOne({ where: { fileType: 'audio', recognizedTextPath: sendedFileId } });
  if (!audioFileRecord) {
    throw new NotFoundError(`Not found audio with this ID: ${sendedFileId}`);
  }
  return audioFileRecord;
};

/**
 * Get the amount of file memory in GB 
 * @param {number} ownerId 
 * @returns 
 */
const getFilesSize = async (ownerId) => {
  const files = await File.findAll({
    where: { ownerId },
    attributes: [[Sequelize.fn('sum', Sequelize.col('size')), 'size']],
  });
  if (!files) {
    throw new NotFoundError(`Not found files with owner ID: ${ownerId}.`, ownerId);
  }
  let size = 0; // in B (байт)
  // eslint-disable-next-line array-callback-return

  files.map((file) => {
    if (!file.size) return;
    size += Number(file.size);
  });
  return size / 1e+9; // * (10 ** -9); // in GB (гигабайт)
};

/**
 * Update file only content by id  
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {*} data 
 * @returns 
 */
const updateFileOnlyContent = async (ownerId, fileId, data) => {
  const file = await File.findOne({
    where: { id: fileId, ownerId },
    attributes: [
      'id',
      'fileName',
      'textTitle',
      'description',
      'recognizedTextPath',
      'size',
    ],
  });
  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}.`, ownerId);
  }
  if (data.content) {
    await updateRecognizedTextFile(file.recognizedTextPath, data.content);
  }

  let title = file.textTitle;

  if (data?.textTitle) {
    title = data.textTitle;
  }

  file.update({
    textTitle: title,
    recognizedTextPreview: data.recognizedTextPreview,
  });

  return {
    id: file.id,
    fileName: file.fileName,
    textTitle: file.textTitle,
    description: file.description,
    recognizedTextPreview: file.recognizedTextPreview,
    content: data.content,
  };
};

/**
 *  Get file with type 'document' by id
 * @param {number} ownerId 
 * @param {number} documentId 
 * @returns 
 */
const getDocumentWithContentById = async (ownerId, documentId) => {
  const document = await getFileById(ownerId, documentId);

  let content = '';

  if (document.recognizedTextPath && Boolean(path.extname(document.recognizedTextPath))) {
    content = (await readFile(document.recognizedTextPath)).toString('utf-8');
  }

  return {
    id: document.id,
    textTitle: document.textTitle,
    content,
    length: document.length,
    words: document.words,
    recognizedTextPreview: document.recognizedTextPreview,
    writingStyle: document.writingStyle,
    createdAt: document.createdAt,
    tonality: document.tonality,
  };
};

/**
 *  Update file with type 'document' by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {*} data 
 * @returns 
 */
const updateDocumentWithContent = async (ownerId, fileId, data) => {
  const file = await File.findOne(
    {
      where: { id: fileId, ownerId },
      attributes: [
        'id',
        'fileName',
        'textTitle',
        'status',
        'description',
        'recognizedTextPath',
        'size',
        'length',
        'words',
        'recognizedTextPreview',
        'tonality',
        'writingStyle',
      ],
    },
  );

  if (!file) {
    throw new NotFoundError(`Not found file with this ID: ${fileId}.`, ownerId);
  }

  let wordsCount = file.words;
  let symbolsCount = file.length;
  let newRecognizedTextPreview = file.recognizedTextPreview;

  if (data.content) {
    await updateRecognizedTextFile(file.recognizedTextPath, data.content);

    newRecognizedTextPreview = parseTextForPreview(data.content);

    wordsCount = data.content
      .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
      .replace(/\s{2,}/, ' ')
      .split(' ')
      .length;

    symbolsCount = data.content
      .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
      .replace(/\s{2,}/, ' ')
      .length;
  }
  file.update({
    fileName: data.fileName,
    textTitle: data.textTitle,
    description: data.description,
    recognizedTextPreview: newRecognizedTextPreview,
    length: symbolsCount,
    words: wordsCount,
  });

  return {
    id: file.id,
    fileName: file.fileName,
    status: file.status,
    textTitle: file.textTitle,
    description: file.description,
    length: file.length,
    words: file.words,
    size: file.size,
    recognizedTextPreview: file.recognizedTextPreview,
    tonality: file.tonality,
    writingStyle: file.writingStyle,
    content: data.content,
  };
};

/**
 * Translate text by Python Api
 * @param {string} inputText 
 * @param {string} lang 
 * @returns 
 */
const translateText = async (inputText, lang) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/google_translator/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field({ input_text: inputText, lang });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  return { ...response, lang };
};

const getCountDocument = async (ownerId, createdAt) => {
  const { count } = await File.findAndCountAll({
    where: {
      ownerId,
      fileType: 'document',
      createdAt: {
        [Op.gte]: createdAt
      }
    }
  })
  return count
}

const getCountDocumentSinceLastPayment = async (ownerId) => {
  const { createdAt } = await getLastPayment(ownerId)
  return await getCountDocument(ownerId, createdAt)
}

module.exports = {
  createFileRecord,
  updateFileRecord,
  createRecognizedTextFile,
  updateRecognizedTextFile,
  getSignedUrl,
  readFile,
  deleteFile,
  getFileById,
  getAudio,
  getAudioWithContentById,
  getAudioFileRecordByApiId,
  getMessage,
  getMessageWithContentById,
  deleteFileRecord,
  getFileWithContentById,
  updateFileWithContent,
  createFileWithContent,
  getFilesSize,
  updateFileOnlyContent,
  getDocument,
  createDocument,
  generateDocument,
  getDocumentWithContentById,
  updateDocumentWithContent,
  translateText,
  getCountDocument,
  getCountDocumentSinceLastPayment,
  getImage,
  generateRewriting,
  generateContinuation,
  generateTitle
};
