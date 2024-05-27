const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const { questions, gamma, smellsNames } = require("./utilities");
const { likertScale } = require("./utilities_button");
const { row, modal } = require("./utilities_menu");
const fs = require("fs");
const { execSync } = require("child_process");
const {
  saveNewUser,
  saveNewCollaborator,
  updateMap,
} = require("./toast.model");

async function executeInteractionSelectMenu(interaction, jsonUserData) {
  // if the interaction is a select menu interaction (and so it is processing the collaborators list)
  // get the id of the collaborator selected by the user
  console.log("\nsono entrato nell 'interazione");
  let choice = interaction.values[0];
  console.log("choice: "+ choice);
  // if the user selected the collaborator to analyze
  if (choice.includes("analyze")) {
    // get the id of the collaborator selected by the user
    let id = choice.split(" ")[1];
    // get the collaborator data from the json file
    let collaborator = jsonUserData.users
      .find((el) => el.userId === interaction.user.id)
      .collaborators.find((el) => el.collaboratorId === id);

    await interaction.reply({
      content: `Beginning analysis of ${collaborator.name} ${collaborator.surname}`,
      components: [],
    });
    const replyMessage = await interaction.fetchReply();
    global.messagesIds.set(interaction.user.id, [replyMessage.id]);

    // start the questions interaction with the collaborator selected
    await nextQuestionButton(interaction, global.index);
  }
  // else, if the user selected one of the options of the select menu
  else {
    switch (choice) {
      // the user has selected the option to start the analysis,
      // so we have to show him the list of his collaborators to choose the one to analyze
      case "start":
        await removeMsg(global.choicesIds, interaction);

        let collaborators = getCollabsByUserID(
          interaction.user.id,
          jsonUserData
        );
        if (collaborators.length !== 0) {
          let select = buildCollabsList(collaborators);
          await interaction.reply({
            content: "Choose the collaborator you want to analyze",
            components: [select],
          });
          const replyMessage = await interaction.fetchReply();
          global.choicesIds.set(interaction.user.id, [replyMessage.id]);
        }
        break;
      // the user has selected the option to add a new collaborator,
      // so we have to show him the modal to insert the data of the new collaborator
      case "add":
        await removeMsg(global.choicesIds, interaction);
        // Show the modal to the user
        await interaction.showModal(modal);

        break;
      default:
        break;
    }
  }
}

async function executeInteractionButtons(smellValues, interaction) {
  // update the smellValues map with the answer of the user
  updateMap(interaction, global.index, gamma, smellValues);
  let content;

  if (global.index + 1 < questions.length)
    content = `Answer collected. Next question`;
  else content = `All questions have been answered`;

  await interaction.update({
    content: content,
    components: [],
  });
  // add the id of the message to the map of the messages to delete them later
  global.messagesIds.get(interaction.user.id).push(interaction.message.id);
  execSync("sleep 1");

  global.index = global.index + 1;
  // if there are still questions to ask, ask the next one
  if (global.index < questions.length)
    await nextQuestionButton(interaction, global.index);
  // else, the interaction is finished and the bot can give the result
  else {
    global.index = 0;
    console.log(smellValues);

    // sleep for 1 second to let the user realize that the interaction is finished
    execSync("sleep 1");

    // delete all the messages sent by the bot during the interaction
    if (global.messagesIds.get(interaction.user.id) !== undefined) {
      let row = global.messagesIds.get(interaction.user.id);

      for (let elem of row) {
        try {
          let message = await interaction.channel.messages.fetch(elem);
          await message.delete();
        } catch (error) {
          console.error("non sono riuscito ad eliminare il messageId:" + elem);
        }
      }

      global.messagesIds.delete(interaction.user.id);
    }

    // get the smell values of the collaborator analyzed
    let values = smellValues.get(interaction.user.id);
    let message = `The following are contributor's values of Community Smells:`;

    for (let value of values) {
      let smellAcr = value[0];
      let smellValue = value[1];

      const smellName = smellsNames[smellAcr];
      message += `\n- ${smellName}: ${smellValue}`;
    }

    // send the result to the user and save the message id to delete it later
    interaction.channel.send(message).then((msg) => {
      global.messagesIds.set(interaction.user.id, [msg.id]);
    });

    // delete the smellValues map entry
    smellValues.delete(interaction.user.id);
  }
}

async function executeChatInteraction(interaction, jsonUserData) {
  if (interaction.commandName === "start") {
    await interaction.reply({
      content:
        "Hi! Welcome to T.O.A.S.T. (Team Observation and Smells Tracking Tool).\n" +
        "I'm here to help you to assess the Community Smells of your collaborators.\n" +
        "I will ask you a series of questions about the collaborator you want to assess, and you will have to answer them.\n" +
        "In the end, i will give you a report on the Community Smells of your collaborator. Let's start!",
      components: [row],
    });
    // get the discordId of the user that started the interaction
    // and save it in the json file if it is not already present
    let user = getUserById(interaction.user.id, jsonUserData);
    if (user === undefined) {
      saveNewUser(interaction.user.id);
    }
  }
}

async function executeModalInteraction(interaction, jsonUserData) {
  console.log(interaction.fields.fields);
  await interaction.reply({
    content: "Data saved",
    components: [],
  });
  const replyMessage = await interaction.fetchReply();
  global.choicesIds.set(interaction.user.id, [replyMessage.id]);

  let name = interaction.fields.fields.get("nameInput").value;
  let surname = interaction.fields.fields.get("surnameInput").value;
  let id = interaction.fields.fields.get("idInput").value;

  saveNewCollaborator(interaction.user.id, name, surname, id, jsonUserData);
}
async function removeMsg(list, interaction) {
  let row = list.get(interaction.user.id);

  if (row !== undefined) {
    for (let elem of row) {
      try {
        let message = await interaction.channel.messages.fetch(elem);
        await message.delete();
      } catch (error) {
        console.error("non sono riuscito ad eliminare il messageId:" + elem);
      }
    }
    list.delete(interaction.user.id);
  }
}

function buildCollabsList(collaborators) {
  let select = new StringSelectMenuBuilder()
    .setCustomId("collab_picker")
    .setPlaceholder("Your Collaborators");

  for (let collaborator of collaborators) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(
          collaborator.name +
            " " +
            collaborator.surname +
            " ID: " +
            collaborator.collaboratorId
        )
        .setValue("analyze " + collaborator.collaboratorId)
    );
  }

  return new ActionRowBuilder().addComponents(select);
}

function getCollabsByUserID(userId, jsonUserData) {
  if (
    !jsonUserData ||
    !jsonUserData.users ||
    !Array.isArray(jsonUserData.users)
  ) {
    console.error(
      "jsonUserData non è definito o non contiene la proprietà 'users'"
    );
    return [];
  }

  let user = jsonUserData.users.find((el) => {
    return el.userId === userId;
  });

  if (!user) {
    saveNewUser(userId, jsonUserData);
    return [];
  } else {
    return user.collaborators || [];
  }
}

async function nextQuestionButton(interaction, index) {
  await interaction.followUp({
    content: questions[index].content,
    components: [likertScale],
  });
}

function getUserById(userId, jsonUserData) {
  return jsonUserData.users.find((el) => {
    return el.userId === userId;
  });
}

module.exports.executeInteractionSelectMenu = executeInteractionSelectMenu;
module.exports.executeInteractionButtons = executeInteractionButtons;
module.exports.executeChatInteraction = executeChatInteraction;
module.exports.executeModalInteraction = executeModalInteraction;
