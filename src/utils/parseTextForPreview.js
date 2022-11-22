const parseTextForPreview = (text) => {
  if (!text) return '';
  return text
    .slice(0, 2000)
    .replace(/<!--[\s\S]*?--!?>/g, '')
    .replace(/<\/?[a-z][^>]*(>|$)/gi, '')
    .slice(0, 150);
};

module.exports = {
  parseTextForPreview,
};
