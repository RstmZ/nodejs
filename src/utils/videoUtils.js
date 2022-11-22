
const uuid = require('uuid');

const targetFile = (filebase, type, format) => {
    if (type == "audio") return cachePrefix + filebase + ".mp3";
    else if (type == "image") return cachePrefix + filebase + "." + format;
    else if (type == "data") return cachePrefix + filebase + ".json";
    else if (type == "lock") return cachePrefix + filebase + ".lock";
}

const msToSSML = async (s) => {
    let ret = await ssmlHelper(s, true);
    // Any remaining tags can be eliminated for tts
    ret = ret.replace(/\[[^\]]*\]/g, "").replace("  ", " "); // e.g. Look [cmd] here. --> Look here.
    return ret;
}

const ssmlHelper = async (s, use) => {
    // SSML is very strict about closing tags - we try to automatically close some tags
    if (use && s.indexOf("[conversational]") != -1 && s.indexOf("[/conversational]") == -1) s += "[/conversational]";
    if (use && s.indexOf("[news]") != -1 && s.indexOf("[/news]") == -1) s += "[/news]";

    // Super-useful [spoken]...[/spoken][written]...[/written] (take all of spoken, take none of written)
    s = s.replace(/\[spoken\](.*?)\[\/spoken\]/g, use ? "$1" : "");
    s = s.replace(/\[written\](.*?)\[\/written\]/g, use ? "" : "$1");

    // Pause
    s = s.replace(/\[silence ([0-9.]*)s\]/g, use ? '<break time="$1s"/>' : '');      // [silence 1.5s]
    s = s.replace(/\[silence ([0-9.]*)ms\]/g, use ? '<break time="$1ms"/>' : '');      // [silence 300ms]

    // Emphasis - note that these are not supported by polly except in non-neural, which we try to avoid, so eliminating from the speech tags for now.

    // Language
    s = s.replace(/\[english\]/g, use ? '<lang xml:lang="en-US">' : '');      // [english]...[/english]
    s = s.replace(/\[\/english\]/g, use ? '</lang>' : '');
    s = s.replace(/\[french\]/g, use ? '<lang xml:lang="fr-FR">' : '');      // [french]...[/french]
    s = s.replace(/\[\/french\]/g, use ? '</lang>' : '');
    s = s.replace(/\[spanish\]/g, use ? '<lang xml:lang="es">' : '');      // [spanish]...[/spanish]
    s = s.replace(/\[\/spanish\]/g, use ? '</lang>' : '');
    s = s.replace(/\[italian\]/g, use ? '<lang xml:lang="it">' : '');      // [italian]...[/italian]
    s = s.replace(/\[\/italian\]/g, use ? '</lang>' : '');
    s = s.replace(/\[german\]/g, use ? '<lang xml:lang="de">' : '');      // [german]...[/german]
    s = s.replace(/\[\/german\]/g, use ? '</lang>' : '');

    // Say as
    s = s.replace(/\[spell\]/g, use ? '<say-as interpret-as="characters">' : '');      // [spell]a[/spell]
    s = s.replace(/\[\/spell\]/g, use ? '</say-as>' : '');
    s = s.replace(/\[digits\]/g, use ? '<say-as interpret-as="digits">' : '');      // [digits]123[/digits]
    s = s.replace(/\[\/digits\]/g, use ? '</say-as>' : '');
    s = s.replace(/\[verb\]/g, use ? '<w role="amazon:VB">' : '');      // [verb]present[/verb]
    s = s.replace(/\[\/verb\]/g, use ? '</w>' : '');
    s = s.replace(/\[past\]/g, use ? '<w role="amazon:VBD">' : '');      // [past]present[/past]
    s = s.replace(/\[\/past\]/g, use ? '</w>' : '');
    s = s.replace(/\[alt\]/g, use ? '<w role="amazon:SENSE_1">' : '');      // [alt]bass[/alt]
    s = s.replace(/\[\/alt\]/g, use ? '</w>' : '');

    // Breathing not supported by neural, so will not include it

    s = s.replace(/\[ipa (.*?)\]/g, use ? '<phoneme alphabet="ipa" ph="$1">' : '');      // [ipa pɪˈkɑːn]pecan[/ipa]
    s = s.replace(/\[\/ipa\]/g, use ? '</phoneme>' : '');
    let m;
    while (m = s.match(/\[sampa (.*?)\]/)) {
        s = s.replace(m[0], use ? '<phoneme alphabet="x-sampa" ph="' + m[1].replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '">' : '');
    }
    s = s.replace(/\[\/sampa\]/g, use ? '</phoneme>' : '');
    s = s.replace(/\[pinyin (.*?)\]/g, use ? '<phoneme alphabet="x-amazon-pinyin" ph="$1">' : '');      // [pinyin bao2]薄[/pinyin]
    s = s.replace(/\[\/pinyin\]/g, use ? '</phoneme>' : '');

    s = s.replace(/\[drc\]/g, use ? '<amazon:effect name="drc">' : '');      // [drc]dynamic range correction[/drc]
    s = s.replace(/\[\/drc\]/g, use ? '</amazon:effect>' : '');

    // Speaking style
    s = s.replace(/\[conversational\]/g, use ? '<amazon:domain name="conversational">' : '');      // [conversational]...[/conversational]
    s = s.replace(/\[\/conversational\]/g, use ? '</amazon:domain>' : '');
    s = s.replace(/\[news\]/g, use ? '<amazon:domain name="news">' : '');      // [news]...[/news]
    s = s.replace(/\[\/news\]/g, use ? '</amazon:domain>' : '');

    // volume
    s = s.replace(/\[volume (.*?)\]/g, use ? '<prosody volume="$1">' : '');      // [volume loud]...[/volume] [volume -6dB]...[/volume]
    s = s.replace(/\[\/volume\]/g, use ? '</prosody>' : '');
    // rate
    s = s.replace(/\[rate (.*?)\]/g, use ? '<prosody rate="$1">' : '');      // [rate slow]...[/rate] [rate 80%]...[/rate]
    s = s.replace(/\[\/rate\]/g, use ? '</prosody>' : '');
    // pitch
    s = s.replace(/\[pitch (.*?)\]/g, use ? '<prosody pitch="$1">' : '');      // [pitch high]...[/pitch] [pitch +5%]...[/pitch]
    s = s.replace(/\[\/pitch\]/g, use ? '</prosody>' : '');

    s = s.replace('&', 'and')
    //if (use && s != old) console.log("SSML: " + old + " -> " + s);
    // if (use) return "<speak>" + s + "</speak>";
    // else return s;
    return s
}

const convertText = async (text) => {
    const resp = text.split(/\.|\?|\!/)
    const length = 700; // длина одной части 
    let newArray = []
    let lenghtAll = 0;
    for (let i = 0; i < resp.length; i++) {
        const text_ = resp[i]
        if (lenghtAll <= length) {
            lenghtAll = lenghtAll + text_.length;
            newArray.push(text_)
        } else {
            break;
        }
    } 
    return await msToSSML(newArray.join(' '));
}

const getUniqFileName = async (originalname) => {
    const name = `${uuid.v4()}${uuid.v4()}`;
    const ext = originalname.split('.').pop();

    return `${name}.${ext}`;
};

module.exports = {
    msToSSML,
    targetFile,
    convertText,
    getUniqFileName
};