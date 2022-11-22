const parseText = (text) => {
  if (!text) return '';
  return text 
    .replace(/<!--[\s\S]*?--!?>/g, '')
    .replace(/<\/?[a-z][^>]*(>|$)/gi, '');
};

const deleteHtmlFromText = (text)=>{
  const newText = text.split(/(<.+>)/gm).filter((row)=> !/(<.+>)/gm.test(row))
  return newText.join(' ')
}

module.exports = {
  parseText,
  deleteHtmlFromText
};
