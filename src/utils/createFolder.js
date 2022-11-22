const fs = require('fs').promises;

const isAccessible = (folderName) => fs.access(folderName).then(() => true).catch(() => false);

const createFolderIfNotExist = async (folderName) => {
  if (!(await isAccessible(folderName))) {
    await fs.mkdir(folderName);
  }
};

module.exports = {
  createFolderIfNotExist,
};
