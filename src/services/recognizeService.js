const { RevAiApiClient } = require('revai-node-sdk');
const pathModule = require('path');
const unirest = require('unirest');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { File } = require('../models/fileModel');
const { ValidationError, AppError, NotFoundError } = require('../utils/errors');
const {
  createRecognizedTextFile,
  updateFileRecord,
  getAudioFileRecordByApiId,
  getFileById,
  readFile,
  createFileWithContent,
  getSignedUrl,
  deleteFileRecord,
} = require('./fileService');
const { Pitch } = require('../models/pitchModel');
const { parseTextForPreview } = require('../utils/parseTextForPreview');

const {
  REVAI_ACCESS_TOKEN, X_RAPIDAPI_KEY, X_RAPIDAPI_HOST, X_RAPIDAPI_ENDPOINT, SERVICE_API_HOST,
} = process.env;

// AUDIO part ------------------------------------------------
// const recognizeAudio = async (ownerId, fileId, filePath) => {
//   const client = new RevAiApiClient(REVAI_ACCESS_TOKEN);
//   // /ngrok authtoken 1xwVP3sdQhDS1BzdyPZD0qpSoTA_62cRWQCTahFurD96mazsm
//   const jobOptions = {
//     language: 'ru',
//     delete_after_seconds: 360,
//     callback_url: 'https://app.prai.co/api/recognize/callback',
//   };

//   try {
//     const buff = getSignedUrl(filePath);

//     // Submit an audio link to Rev.ai
//     const response = await client.submitJobUrl(buff, jobOptions);

//     // Submit an audio file to Rev.ai
//     // const response = await client.submitJobLocalFile(buff, jobOptions);
//     const data = { status: 'Draft', recognizedTextPath: response.id };
//     await updateFileRecord(ownerId, fileId, data);
//   } catch (error) {
//     throw new AppError(error);
//   }
//   return { message: 'Audio was sent.' };
// };

/**
 * Recognize audio by Python API 
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {string} fileKey 
 * @param {string} fileLength 
 * @param {number} pitchId 
 * @param {string} story 
 * @returns 
 */
const recognizeAudio = async (ownerId, fileId, fileKey, fileLength, pitchId, story) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/speech/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('type_filepath', 'url');
  uni.field('url_audio_file', getSignedUrl(fileKey));
  uni.field('audio_duration', fileLength || '');

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new AppError(res.error.message);
    return JSON.parse(res.body);
  });

  const data = { status: 'Draft', recognizedTextPath: response.job_id };
  await updateFileRecord(ownerId, fileId, data);

  if (pitchId && story && ownerId) {
    const pitch = await Pitch.findOne({ where: { ownerId, id: pitchId } });
    if (!pitch) {
      throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
    }
    await pitch.update(
      {
        [`${story}OriginalId`]: fileId,
      },
    );
  }

  return { message: 'Audio was sent.' };
};

/**
 * Check recorgnize audio by id
 * @param {number} ownerId 
 * @param {number} fileId 
 * @returns 
 */
const checkRecognizeAudioStatus = async (ownerId, fileId) => {
  const file = await File.findOne({ where: { id: fileId, ownerId } });
  if (!file) throw new NotFoundError('Audio file not found', ownerId);
  if (file.fileType !== 'audio') throw new AppError('It is not an audio file');
  if (!file.recognizedTextPath) throw new AppError('Job Id not found');

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

  if (response.message === 'Progress') {
    return response;
  }
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

    return {
      message: response.message,
      status: response.status,
      content: response.text_interviewee,
    };
  }
  if (response.message === 'Failed') {
    await file.update({ status: 'Failed' });
    throw new AppError('Recognizing failed');
  }
  throw new AppError('Something went wrong');
};

const recognizeAudioCallback = async (audioId) => 'old Version';
//   const client = new RevAiApiClient(REVAI_ACCESS_TOKEN);
//   try {
//     const transcript = await client.getTranscriptText(audioId);
//     const recognizedAudioDetails = await client.getJobDetails(audioId);
//     const { dataValues: { id, ownerId } } = await getAudioFileRecordByApiId(audioId);
//     if (recognizedAudioDetails.status === 'failed') {
//       await file(ownerId, id, { status: 'Failed' });
//       throw new AppError('Recognizing faild');
//     }
//     const recognizedFilePath = await createRecognizedTextFile(transcript);
//     const wordsCount = transcript
//       .replace(/[.,/#!|$%+^&*;?:{}=\-_`~()0123456789\n+]/g, '')
//       .replace(/\s{2,}/, ' ')
//       .split(' ')
//       .length;
//     const data = {
//       length: recognizedAudioDetails.duration_seconds,
//       recognizedTextPath: recognizedFilePath,
//       words: wordsCount,
//       status: 'Completed',
//     };
//     await updateFileRecord(ownerId, id, data);
//   } catch (error) {
//     throw new AppError(error);
//   }
//   // Deleting Job from Api
//   await client.deleteJob(audioId);
// };
// End of AUDIO part -----------------------------------------


/**
 * Recognize pdf
 * @param {string} fileSource 
 * @returns 
 */
const recognizePdf = async (fileSource) => {
  const req = unirest('POST', X_RAPIDAPI_ENDPOINT);

  req.headers({
    'content-type': 'application/json',
    'x-rapidapi-key': X_RAPIDAPI_KEY,
    'x-rapidapi-host': X_RAPIDAPI_HOST,
    useQueryString: true,
  });

  const base64data = (await readFile(fileSource)).toString('base64');

  req.type('json');
  req.send({
    data: base64data,
  });

  return req.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body.data;
  });
};

/**
 * Recognize doc
 * @param {string} fileSource 
 * @returns 
 */
const recognizeDoc = async (fileSource) => {
  try {
    const buffer = await readFile(fileSource);
    const wordExtractor = new WordExtractor();
    const extracted = await wordExtractor.extract(buffer);
    return extracted.getBody();
  } catch (error) {
    throw new AppError('Error recognizing doc file.');
  }
};

/**
* Recognize docx
* @param {string} fileSource 
* @returns 
*/
const recognizeDocx = async (fileSource) => {
  try {
    const buffer = await readFile(fileSource);
    const content = await mammoth.extractRawText({ buffer });
    return content.value;
  } catch (error) {
    throw new AppError('Error recognizing docx file.');
  }
};

/**
 * Recognize file by id 
 * @param {number} ownerId 
 * @param {number} fileId 
 * @param {number} pitchId 
 * @param {string} story 
 * @returns 
 */
const recognizeFunction = async (ownerId, fileId, pitchId, story) => {
  const file = await getFileById(ownerId, fileId);
  let response;
  if (file.fileType === 'audio') {
    response = await recognizeAudio(ownerId, fileId, file.key, file.length, pitchId, story);
  } else if (file.fileType === 'document') {
    const fileExtention = pathModule.extname(file.fileSource);
    let transcript = '';
    switch (fileExtention) {
      case '.txt': {
        transcript = (await readFile(file.key)).toString('utf-8');
        break;
      }

      case '.pdf': {
        transcript = await recognizePdf(file.key);
        break;
      }

      case '.doc': {
        transcript = await recognizeDoc(file.key);
        break;
      }

      case '.docx': {
        transcript = await recognizeDocx(file.key);
        break;
      }

      default: {
        throw new ValidationError('Unsupported file type', ownerId);
      }
    }
    try {
      const recognizedFilePath = await createRecognizedTextFile(transcript);
      const data = {
        recognizedTextPath: recognizedFilePath,
        recognizedTextPreview: parseTextForPreview(transcript),
      };
      response = await updateFileRecord(ownerId, fileId, data);

      if (pitchId && story && ownerId) {
        const pitch = await Pitch.findOne({ where: { ownerId, id: pitchId } });
        if (!pitch) {
          throw new NotFoundError(`Not found pitch with this ID: ${pitchId}`, ownerId);
        }
        await pitch.update(
          {
            [`${story}OriginalId`]: response.id,
          },
        );
      }

      return {
        id: response.id,
        textTitle: response.textTitle,
        description: response.description,
        fileName: response.fileName,
        size: response.size,
        recognizedTextPreview: parseTextForPreview(transcript),
        content: transcript,
      };
    } catch (error) {
      throw new AppError(error);
    }
  } else {
    throw new ValidationError('Invalid file type.', ownerId);
  }
  return response;
};

/**
 * Recognize link by Python Api
 * @param {number} ownerId 
 * @param {*} body 
 * @returns 
 */
const recognizeLink = async (ownerId, body) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/url/`);

  uni.headers({
    'content-type': 'multipart/form-data',
  });

  uni.field('url', body.link);

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });

  if (body.pitchId && body.story && ownerId) {
    const data = {
      fileSource: body.link,
      content: response.text_from_url,
      textTitle: response.title
    };
    const pitch = await Pitch.findOne({ where: { ownerId, id: body.pitchId } });
    if (!pitch) {
      throw new NotFoundError(`Not found pitch with this ID: ${body.pitchId}`, ownerId);
    }
    if (pitch[body.story]) {
      await updateFileRecord(ownerId, pitch[body.story], data)
    } else {
      const newFile = await createFileWithContent(ownerId, data);
 
      await pitch.update(
        {
          [`${body.story}`]: newFile.id,
        },
      );
    }
    return {
      ...response,
      noteId: pitch[body.story]
    }
    // try {
    //   // if (pitch[`${body.story}OriginalId`]) await deleteFileRecord(ownerId, pitch[`${body.story}OriginalId`]);
    // } catch (error) {
    //   // TODO: Сделать рефактор, если делит файл рекорд вернула ошибку, нужно выполнять код дальше.
    //   // eslint-disable-next-line
    //   console.log(error);
    // }

    // return newFile;
  }
  return response;
};

/**
 * Chat bot by Python Api
 * @param {string} query 
 * @returns 
 */
const chatBot = async (query) => {
  const uni = unirest('POST', `${SERVICE_API_HOST}/chat_bot/`);

  uni.headers({ 'Accept': 'application/json', 'Content-Type': 'application/json' });

  uni.send({ query });

  uni.auth({
    user: 'prai',
    pass: 'praiapp',
    sendImmediately: true,
  });

  const response = await uni.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.body;
  });
  return response
}

module.exports = {
  recognizeFunction,
  recognizeAudioCallback,
  checkRecognizeAudioStatus,
  recognizeLink,
  chatBot
};
