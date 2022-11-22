const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const {
  getAudio,
  getMessage,
  deleteFileRecord,
  updateFileWithContent,
  createFileWithContent,
  getAudioWithContentById,
  getMessageWithContentById,
  getFileWithContentById,
  getFilesSize,
  updateFileOnlyContent,
  getDocument,
  createDocument,
  generateDocument,
  getDocumentWithContentById,
  updateDocumentWithContent,
  translateText,
  generateRewriting,
  generateContinuation,
  generateTitle,
} = require('../services/fileService');
const { getProfile } = require('../services/profileService');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');

const { asyncWrapper } = require('../utils/apiUtils');
const { parseTextForPreview } = require('../utils/parseTextForPreview'); 
const stripeService = require('../services/stripeService')
const { getPaymentLimit, getPaymentLimitByOwnerId } = require('../services/paymentService');
const { testAccountIsLimits } = require('../services/userService');

const fileRouter = express.Router();


// Get files with type 'audio' with filter and sort
fileRouter.get('/audio', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const {
    page = 1, limit = 10, sort = 'textTitle', param = 'asc', search = '',
  } = req.query;
  const audios = await getAudio(ownerId, page, limit, sort, param, search);
  res.json(audios);
}));

// Get file with type 'audio' by id
fileRouter.get('/audio/:audioId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { audioId } = req.params;
  const ownerId = req.invitationUserId;
  const audio = await getAudioWithContentById(ownerId, audioId);
  res.json(audio);
}));

// Get files with type 'note' and filter and sort
fileRouter.get('/message', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.invitationUserId;
  const {
    page = 1, limit = 10, sort = 'createdAt', param = 'desc', search = '',
  } = req.query;
  const messages = await getMessage(ownerId, page, limit, sort, param, search);
  res.json(messages);
}));

// Get file with type 'note' by id
fileRouter.get('/message/:messageId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { messageId } = req.params;
  const ownerId = req.invitationUserId;
  const message = await getMessageWithContentById(ownerId, messageId);
  res.json(message);
}));

// Create file with type 'note' 
fileRouter.post('/message', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const message = {
    ...req.body,
    recognizedTextPreview: parseTextForPreview(req.body.content),
    fileType: 'note',
  };
  const messages = await createFileWithContent(ownerId, message);
  res.json(messages);
}));

// Update file  with type 'note' by id
fileRouter.put('/message/:messageId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { messageId } = req.params;
  const ownerId = req.session.user.id;
  const messages = await updateFileWithContent(ownerId, messageId, {
    ...req.body,
    recognizedTextPreview: parseTextForPreview(req.body.content),
  });
  res.json(messages);
}));

// Delete file by id
fileRouter.delete('/file/:fileId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { fileId } = req.params;
  const ownerId = req.session.user.id;
  const messages = await deleteFileRecord(ownerId, fileId);
  res.json(messages);
}));

// Get file by id 
fileRouter.post('/file/', invitationTokenMiddleware, userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { fileId } = req.body;
  const ownerId = req.invitationUserId;
  const file = await getFileWithContentById(ownerId, fileId);
  res.json(file);
}));

// Update file only content by id 
fileRouter.put('/file/:fileId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { fileId } = req.params;
  const { title, content } = req.body;
  const ownerId = req.session.user.id;
  const data = {
    content,
    textTitle: title,
    recognizedTextPreview: parseTextForPreview(content),
  };
  const contentFile = await updateFileOnlyContent(ownerId, fileId, data);
  res.json(contentFile);
}));

// Delete file by ids
fileRouter.post('/file/delete/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const { ids } = req.body;
  const deleted = await Promise.all(ids.map(async (contactId) => {
    try {
      const response = await deleteFileRecord(ownerId, contactId);
      return {
        msg: response,
      };
    } catch (error) {
      return error;
    }
  }));
  res.json(deleted);
}));

// Get info file size and max size in profile by owner id
fileRouter.get('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;

  const size = await getFilesSize(ownerId);
  const profile = await getProfile(ownerId);
  if (!profile) return;
  res.json({
    size,
    max: profile.countSizes,
  });
}));

// Get files with type 'document' with filter and sort
fileRouter.get('/document', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const ownerId = req.session.user.id;
  const {
    page = 1, limit = 10, sort = 'textTitle', param = 'asc', search = '',
  } = req.query;
  const documents = await getDocument(ownerId, page, limit, sort, param, search);
  res.json(documents);
}));

// Create file with type 'document'
fileRouter.post('/document', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { id: ownerId, email } = req.session.user;
  let paymentLastId = null;

  if (!await testAccountIsLimits(email)) {
    const { type, countDocuments } = await getProfile(ownerId)
    if (type == "Trial") {

      const { currentDocuments } = await getPaymentLimitByOwnerId(ownerId)
 
      if (currentDocuments >= countDocuments) {
        return res.status(400).json({ message: "Document limits exceeded. Please update the limits in settings." });
      }

    } else {
      const sub = await stripeService.getByUserIdSubscription(ownerId)
      const { paymentId } = await stripeService.getLastInfoPayment(ownerId, sub?.items?.data[0]?.price?.id)

      const { currentDocuments } = await getPaymentLimit(paymentId)

      paymentLastId = paymentId

      if (currentDocuments >= countDocuments) {
        return res.status(400).json({ message: "Document limits exceeded. Please update the limits in settings." });
      }
    }
  }

  const { content, title, writingStyle } = req.body;

  const { status, ...result } = await createDocument(ownerId, content, title, writingStyle, paymentLastId);
  res.status(status).json(result);
}));

// Geterate document with Python Api
fileRouter.post('/document/generate', userSessionMiddleware, asyncWrapper(async (req, res) => {
  // const ownerId = req.session.user.id;
  const {
    // title,
    summary,
    writingStyle,
  } = req.body;
  const document = await generateDocument(summary, writingStyle);
  res.json(document);
}));

// Geterate rewriting with Python Api
fileRouter.post('/document/rewriting', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const {
    summary,
    writingStyle,
  } = req.body;
  const { status, ...response } = await generateRewriting(summary, writingStyle);
  res.status(status).json(response);
}));

// Geterate continuation with Python Api
fileRouter.post('/document/continuation', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const {
    summary,
    writingStyle,
  } = req.body;
  const { status, ...response } = await generateContinuation(summary, writingStyle);
  res.status(status).json(response);
}));

// Geterate title with Python Api
fileRouter.post('/document/title', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const {
    title,
  } = req.body;
  const { status, ...response } = await generateTitle(title);
  res.status(status).json(response);
}));

//  Get file with type 'document' by id
fileRouter.get('/document/:documentId', invitationTokenMiddleware, asyncWrapper(async (req, res) => {
  const { documentId } = req.params;
  const ownerId = req.invitationUserId;
  const document = await getDocumentWithContentById(ownerId, documentId);
  res.json(document);
}));

// Update file with type 'document' by id
fileRouter.put('/document/:documentId', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { documentId } = req.params;
  const ownerId = req.session.user.id;
  const documents = await updateDocumentWithContent(ownerId, documentId, {
    ...req.body,
    // recognizedTextPreview: parseTextForPreview(req.body.content),
  });
  res.json(documents);
}));

// Translate text by Python Api
fileRouter.post('/document/translate', userSessionMiddleware, asyncWrapper(async (req, res) => {
  const { inputText, lang } = req.body;
  const request = await translateText(inputText, lang);
  res.json(request);
}));

module.exports = {
  fileRouter,
};
