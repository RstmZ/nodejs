const allowedFileTypes = {
  documents: ['.txt', '.pdf', '.doc', '.docx'],
  audio: ['.mp3', '.ogg', '.wav', '.m4a'],
  images: ['.png', '.jpg', '.jpeg'],
};

const allowedFileTypesCheck = (fileExtention) => {
  if (allowedFileTypes.documents.includes(fileExtention)) return 'document';
  if (allowedFileTypes.audio.includes(fileExtention)) return 'audio';
  if (allowedFileTypes.images.includes(fileExtention)) return 'image';
  return false;
};

module.exports = {
  allowedFileTypesCheck,
};
