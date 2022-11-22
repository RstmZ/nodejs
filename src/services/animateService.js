const unirest = require('unirest');
const fs = require('fs');

const { polly, clientS3 } = require('../awsConnection');
const { msToSSML, getUniqFileName, convertText } = require('../utils/videoUtils');
const { NotFoundError, AppError } = require('../utils/errors');
const { createFileRecord, getSignedUrl } = require('./fileService');
const { File } = require('../models/fileModel');
const { VideoGen } = require('../utils/videoGen');
const { updateCampaign } = require('./campaignService');

const { AWS_BUCKET_NAME, KEY_ANIMATE } = process.env;

const getCharacters = async () => {
    const uni = unirest('GET', `http://api.mediasemantics.com/catalog?key=${KEY_ANIMATE}`);

    const { characters } = await uni.then((res) => {
        if (res.error) throw new AppError(res.error.message);
        return JSON.parse(res.body);
    });

    return characters.map((element) => {
        return {
            character: element.id,
            voice: element.defaultVoice,
            version: element.version
        }
    });
}

const createVoice = async (text, voice) => {
    let neural = false;
    if (voice.substr(0, 6) == "Neural") { // NeuralJoanna or Joanna
        neural = true;
        voice = voice.substr(6);
    }

    const params = {
        OutputFormat: 'mp3',
        Text: await msToSSML(text),
        VoiceId: voice,
        Engine: (neural ? "neural" : "standard"),
        TextType: "ssml"
    };
    try {
        const path = `${process.cwd()}/uploads/${index}.mp3`
        const data = await generatePollyAudio(params);
        fs.createWriteStream(path).write(data.AudioStream);

    } catch (error) {
        console.log('error', error.message);
    }
    return {
        msg: 'ok'
    }
}

const uploadFileAnimate = async (ownerId, fileId) => {
    const file = await File.findOne({ where: { ownerId, id: fileId } });
    if (!file) {
        throw new NotFoundError(`Not found file with this ID: ${fileId}.`, ownerId);
    }
    const path = `${process.cwd()}/uploads/${file.fileName}`
    const fileStream = fs.createReadStream(path);
    const uploadParams = {
        Bucket: AWS_BUCKET_NAME || 'co-prai-app-test',
        Body: fileStream,
        Key: file.fileName,
    };
    const { Location, Key } = await clientS3.upload(uploadParams).promise(); // this will upload file to S3

    file.update({ fileSource: Location, key: Key })

    return getSignedUrl(Key);
}

const createAnimate = async (ownerId, character, version, text, voice = 'NeuralJoanna', campaignId) => {
    const nameFile = await getUniqFileName('1.mp4')
    const path = `${process.cwd()}/uploads/${nameFile}`
    try {
        const newText = await convertText(text)

        const video = new VideoGen({
            character: character,
            characterVersion: version,
            width: 250,
            height: 200,
            voice: voice,
            text: `<headnod/> ${newText}`,
            outputFile: path
        })

        await video.render();

        const file = await createFileRecord(ownerId, nameFile, 0, '', '', 'video', 0);

        const key = await uploadFileAnimate(ownerId, file.id)

        await fs.unlinkSync(path);

        await updateCampaign(ownerId, campaignId, { videoUrl: key })

        return {
            success: true,
            key
        }
    } catch (error) {

        return {
            success: false
        }
    }
}

const generatePollyAudio = async (params) => {
    const audio = await polly.synthesizeSpeech(params).promise();
    if (audio.AudioStream instanceof Buffer)
        return audio;
    throw new NotFoundError('AudioStream is not a Buffer.');
}

const getPictureCharacter = async (character, version) => {
    return {
        "link": `https://api.mediasemantics.com/animate?key=${KEY_ANIMATE}&character=${character}&version=${version}&format=png&strip=true`
    }
}

module.exports = {
    getCharacters,
    createVoice,
    createAnimate,
    uploadFileAnimate,
    getPictureCharacter
};