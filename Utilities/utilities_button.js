const {ButtonBuilder, ButtonStyle, ActionRowBuilder} = require("discord.js");
const strDis = new ButtonBuilder()
    .setCustomId('strDis')
    .setLabel('Strongly Disagree')
    .setStyle(ButtonStyle.Primary);

const dis = new ButtonBuilder()
    .setCustomId('dis')
    .setLabel('Disagree')
    .setStyle(ButtonStyle.Primary);

const neutral = new ButtonBuilder()
    .setCustomId('neutral')
    .setLabel('Neither Agree nor Disagree')
    .setStyle(ButtonStyle.Primary);

const agree = new ButtonBuilder()
    .setCustomId('agree')
    .setLabel('Agree')
    .setStyle(ButtonStyle.Primary);

const strAgree = new ButtonBuilder()
    .setCustomId('strAgree')
    .setLabel('Strongly Agree')
    .setStyle(ButtonStyle.Primary)
;

const likertScale = new ActionRowBuilder()
    .addComponents(strDis, dis, neutral, agree, strAgree);

module.exports.likertScale = likertScale;
