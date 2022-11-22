const express = require('express');
const multerS3 = require('multer-s3');
const uuid = require('uuid');
const multer = require('multer');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs').promises;
const path = require('path');
const { clientS3 } = require('../awsConnection');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { uploadFile } = require('../services/uploadService');
const { asyncWrapper } = require('../utils/apiUtils');
const { ValidationError, AppError } = require('../utils/errors');
const { wrapWithErrorMiddleware } = require('../middlewares/wrapWithErrorMiddleware');
const { readFile } = require('../services/fileService');
const { createFolderIfNotExist } = require('../utils/createFolder');

const { AWS_BUCKET_NAME } = process.env;

const isAudio = (mime) => [
  'audio/wave',
  'audio/wav',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
  'audio/mp4',
].includes(mime.toString());

const isAllowedMimetype = (mime) => [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/webp',
  'audio/wave',
  'audio/wav',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].includes(mime.toString());

/**
 * Filter file
 * @param {*} req 
 * @param {*} file 
 * @param {*} callback 
 */
const fileFilter = (req, file, callback) => {
  const fileMime = file.mimetype;
  const { type } = req.body; 
  if (!type) {
    callback(new ValidationError("Key 'type' not found."));
  } else if (isAllowedMimetype(fileMime)) {
    callback(null, true);
  } else {
    callback(new ValidationError('Invalid file extention.'));
  }
};

const getUniqFileName = (originalname) => {
  const name = `${uuid.v4()}${uuid.v4()}`;
  const ext = originalname.split('.').pop();

  return `${name}.${ext}`;
};

/**
 * Handler upload file in S3
 */
const handleUploadMiddleware = multer({
  fileFilter,
  limits: {
    fileSize: 31457280, // 30 Mb
  },
  storage: multerS3({
    s3: clientS3,
    bucket: AWS_BUCKET_NAME || 'co-prai-app-test',
    acl(req, file, cb) {
      cb(null, 'private');
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      const fileName = getUniqFileName(file.originalname);
      // const s3InnerDirectory = 'publicAsset';
      // const finalPath = `${s3InnerDirectory}/${fileName}`;
      const finalPath = `${fileName}`;
      cb(null, finalPath);
    },
  }),
}).single('file');

const uploadRouter = express.Router();

// Upload file
uploadRouter.post(
  '/',
  userSessionMiddleware,
  wrapWithErrorMiddleware(handleUploadMiddleware, AppError),
  asyncWrapper(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File not found.');
    }

    if (isAudio(req.file.mimetype) && !req.body.audioLength) {
      const file = await readFile(req.file.key);
      const tempFolder = path.join(process.cwd(), 'src', 'filesTemp');

      await createFolderIfNotExist(tempFolder);

      const tempPath = path.join(tempFolder, `${uuid.v4()}.audio`);

      await fs.writeFile(tempPath, file);

      req.file.length = (await getAudioDurationInSeconds(tempPath)).toFixed(0);

      await fs.unlink(tempPath);
    }

    if (req.body.audioLength) req.file.length = parseInt(req.body.audioLength, 10).toFixed(0);

    const ownerId = req.session.user.id;
    const result = await uploadFile(ownerId, req);

    if (result?.msg) {
      res.status(400).json(result);
    }

    res.json(result);
  }),
);

module.exports = {
  uploadRouter,
};
