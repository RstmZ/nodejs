const pathModule = require('path');
const { createFileRecord, deleteFile, getSignedUrl } = require('./fileService');
const { ValidationError } = require('../utils/errors');
const { setCampaignImage } = require('./campaignService');
const { setUserImage } = require('./userService');
const { allowedFileTypesCheck } = require('../utils/allowedFileTypesCheck');
const { getFilesSize } = require('../services/fileService');
const { getCountSizes } = require('../services/profileService');

const ifInvalidFileType = async (key, errorMessage) => {
  await deleteFile(key);
  throw new ValidationError(errorMessage);
};

/**
 * Upload file
 * @param {number} ownerId 
 * @param {*} req 
 * @returns 
 */
const uploadFile = async (ownerId, req) => {
  const { type, campaignId, contactId } = req.body;
  const {
    originalname: originalName, size, key, location, length,
  } = req.file;

  let response;
  const fileExtention = pathModule.extname(location);

  const sizeGb = size * (10 ** -9);
  const sizesProfile = await getCountSizes(ownerId);
  const sizeCurrent = await getFilesSize(ownerId);
  const result = sizeCurrent + sizeGb;

  if (result > sizesProfile) {
    return {
      msg: 'not enough memory',
    };
  }

  switch (type) {
    case 'document': {
      if (allowedFileTypesCheck(fileExtention) === 'document') {
        response = await createFileRecord(ownerId, originalName, size, key, location, type);
        break;
      }
      await ifInvalidFileType(key, 'Unsupported document type. File was deleted!');
      break;
    }

    case 'audio': {
      if (allowedFileTypesCheck(fileExtention) === 'audio') {
        response = await createFileRecord(
          ownerId, originalName, size, key, location, type, length,
        );
        break;
      }
      await ifInvalidFileType(key, 'Unsupported document type. File was deleted!');
      break;
    }

    case 'campaignImage': {
      if (!campaignId) {
        await ifInvalidFileType(key, "You need to send campaign Id value in key 'campaignId'. File was deleted!");
        break;
      }
      if (allowedFileTypesCheck(fileExtention) === 'image') {
        const { id: fileId } = await createFileRecord(
          ownerId, originalName, size, key, location, type,
        );
        response = await setCampaignImage(ownerId, campaignId, fileId);
        break;
      }
      await ifInvalidFileType(key, 'Unsupported image type. File was deleted!');
      break;
    }

    case 'userAvatar': {
      if (allowedFileTypesCheck(fileExtention) === 'image') {
        // await createFileRecord(ownerId, originalName, size, key, location, type);
        response = await setUserImage(ownerId, location);
        break;
      }
      await ifInvalidFileType(key, 'Unsupported image type. File was deleted!');
      break;
    }

    case 'contactAvatar': {
      if (allowedFileTypesCheck(fileExtention) === 'image') {
        await createFileRecord(ownerId, originalName, size, key, location, type);
        const link = await getSignedUrl(key);
        response = {
          link,
          location,
        };
        break;
      }
      await ifInvalidFileType(key, 'Unsupported image type. File was deleted!');
      break;
    }

    default: {
      await ifInvalidFileType(key, 'Invalid file type. File was deleted!');
      break;
    }
  }

  return response;
};

module.exports = {
  uploadFile,
};
