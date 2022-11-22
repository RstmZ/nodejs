const express = require('express');
const unirest = require('unirest');
const { sequelize } = require('../databaseConnection');
const { Contact } = require('../models/contactModel');
const { ContactNote } = require('../models/contactNoteModel');
const { asyncWrapper } = require('../utils/apiUtils');
const { AppError } = require('../utils/errors');

const testRouter = express.Router();

testRouter.get('/', asyncWrapper(async (req, res) => {
  const version = process.env.VERSION || 'EMPTY';

  let base;
  try {
    base = await sequelize.databaseVersion();
  } catch (error) {
    throw new AppError(error);
  }

  res.json({ version, base });
}));

testRouter.get('/test/', asyncWrapper(async (req, res) => {
  // const testttt = await Contact.findAll({ include: { model: ContactNote } });
  const testttt = await Contact.findAll({ include: { model: ContactNote } });
  res.json(testttt);
}));

testRouter.post('/', asyncWrapper(async (req, res) => {
  const uni = unirest('POST', 'http://192.168.1.116:105/summarization/');

  const key1 = 'text';
  const key2 = "Resident Evil's Leon S. Kennedy is now available in  Rainbow Six Siege  ... sort of. While the fan-favorite character is certainly qualified enough to be an operator in his own right, fans will have to settle for Leon as an elite operator skin bundle for existing playable character Lion.\nSporting Leon's iconic look from  Resident Evil 4  (minus his cool jacket), Lion's Leon outfit includes all the zombie-fighting essentials--a skintight undershirt, a knife, fancy weapon holsters, and lots and lots of ammo pouches. As Lion's signature ability is a drone that can be used three times per round to reveal the positions of moving enemies, the character's drone will also be getting a skin as part of this new bundle.\nor\n\nand\n\nThe complete elite skin bundle includes a headgear, uniform, victory animation, drone gadget skin, charm, and weapon skins for the V308, 417, SG-CQB, P9, and LFP86.\nThis isn't the first Rainbow Six and Resident Evil crossover. Earlier this year, Ubisoft added a  Jill Valentine skin  for operator Zofia, which saw the character sporting Jill's iconic STARS uniform as seen in the original  Resident Evil  . We can only hope  Resident Evil Village's  Chris Redfield is next.\nLeon can most recently be seen in the new Netflix-exclusive CGI series  Resident Evil: Infinite Darkness  , which takes place between the events of Resident Evil 4 and 5. As for Rainbow Six Siege, Ubisoft recently unveiled all the new content and changes coming to the game as part of  Operation Crystal Guard  , which will see the addition of the game's first transgender operator, the  attacker Osa  . Not content to let Resident Evil have all the fun zombie-killing fun, Rainbow Six will also be venturing into the horror genre with an upcoming co-op focused spinoff,  Rainbow Six Extraction  , slated to release in January 2022.";

  uni.headers({
    'content-type': 'multipart/form-data',
  });
  uni.field(key1, key2);

  res.json(await uni.then((response) => {
    if (response.error) throw new Error(response.error);
    return response.body;
  }));
}));

module.exports = {
  testRouter,
};
