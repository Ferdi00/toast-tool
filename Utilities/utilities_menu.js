const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const select = new StringSelectMenuBuilder()
    .setCustomId('starter')
    .setPlaceholder('Which action you want to perform?')
    .addOptions(new StringSelectMenuOptionBuilder()
        .setLabel('Add a new collaborator to your team')
        .setDescription('Add a new collaborator to your team to analyze the behavior')
        .setValue('add'), new StringSelectMenuOptionBuilder()
        .setLabel('Start the analysis of a collaborator')
        .setDescription('Start the analysis questions. Select a collaborator to start ')
        .setValue('start'),);

const row = new ActionRowBuilder()
    .addComponents(select);

const modal = new ModalBuilder()
    .setCustomId('myModal')
    .setTitle('Add a new collaborator to your team')

// Add components to modal

// Create the text input components
modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('nameInput')
        // The label is the prompt the user sees for this input
        .setLabel("Name of the collaborator")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short)
    )


).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('surnameInput')
        // The label is the prompt the user sees for this input
        .setLabel("Surname of the collaborator")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short)
    )

).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('idInput')
        // The label is the prompt the user sees for this input
        .setLabel("ID of the collaborator")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short)
    )

)

module.exports.row = row;
module.exports.modal = modal;
