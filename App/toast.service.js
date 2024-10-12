const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const { questions, gamma, smellsNames } = require("./Utilities/utilities");
const { likertScale } = require("./Utilities/utilities_button");
const { row, modal } = require("./Utilities/utilities_menu");
const fs = require("fs");
const { execSync } = require("child_process");
const {
  saveNewUserFromDiscord,
  saveNewCollaborator,
  updateMap,
} = require("./toast.model");

// Select Menu Interaction
async function executeInteractionSelectMenu(interaction, jsonUserData) {
  try {
    let choice = interaction.values[0];
    console.log("CHOICE: ", choice);

    if (choice.includes("analyze")) {
      let id = choice.split("_")[1];
      let user = jsonUserData.users.find(
        (el) => el.userId === interaction.user.id
      );

      // Handle missing user or collaborators
      if (!user || !user.collaborators) {
        console.error("User or collaborators not found");
        await interaction.reply({
          content: "Error: Could not find the collaborator. Please try again.",
          ephemeral: true,
        });
        return;
      }

      let collaborator = user.collaborators.find(
        (el) => el.collaboratorId === id
      );
      if (!collaborator) {
        console.error(
          `Collaborator with ID ${id} not found for user ${interaction.user.id}`
        );
        await interaction.reply({
          content: "Collaborator not found.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Beginning analysis of ${collaborator.name} ${collaborator.surname}`,
        components: [],
      });

      const replyMessage = await interaction.fetchReply();
      global.messagesIds.set(interaction.user.id, [replyMessage.id]);

      await nextQuestionButton(interaction, global.index);
    } else {
      switch (choice) {
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

        case "add":
          await removeMsg(global.choicesIds, interaction);
          await interaction.showModal(modal);
          break;

        default:
          console.warn("Unknown choice received: ", choice);
          break;
      }
    }
  } catch (error) {
    console.error("Error executing interaction: ", error);
    await interaction.reply({
      content: "An error occurred. Please try again later.",
      ephemeral: true,
    });
  }
}

// Button Interaction
async function executeInteractionButtons(smellValues, interaction) {
  try {
    updateMap(interaction, global.index, gamma, smellValues);
    let content =
      global.index + 1 < questions.length
        ? "Answer collected. Next question"
        : "All questions have been answered";

    await interaction.update({
      content: content,
      components: [],
    });

    global.messagesIds.get(interaction.user.id).push(interaction.message.id);
    execSync("sleep 1");

    global.index += 1;

    if (global.index < questions.length) {
      await nextQuestionButton(interaction, global.index);
    } else {
      global.index = 0;

      execSync("sleep 1");

      if (global.messagesIds.get(interaction.user.id)) {
        for (let elem of global.messagesIds.get(interaction.user.id)) {
          try {
            let message = await interaction.channel.messages.fetch(elem);
            await message.delete();
          } catch (error) {
            console.error("Unable to delete messageId: " + elem);
          }
        }

        global.messagesIds.delete(interaction.user.id);
      }

      let values = smellValues.get(interaction.user.id);
      let message = `The following are contributor's values of Community Smells:`;

      for (let value of values) {
        const smellName = smellsNames[value[0]];
        message += `\n- ${smellName}: ${value[1]}`;
      }

      interaction.channel.send(message).then((msg) => {
        global.messagesIds.set(interaction.user.id, [msg.id]);
      });

      smellValues.delete(interaction.user.id);
    }
  } catch (error) {
    console.error("Error processing button interaction: ", error);
  }
}

// Chat Command Interaction
async function executeChatInteraction(interaction, jsonUserData) {
  try {
    if (interaction.commandName === "start") {
      await interaction.reply({
        content:
          "Hi! Welcome to T.O.A.S.T. (Team Observation and Smells Tracking Tool).\n" +
          "I will guide you through assessing the Community Smells of your collaborators.",
        components: [row],
      });

      let user = getUserById(interaction.user.id, jsonUserData);
      if (!user) {
        saveNewUserFromDiscord(interaction.user.id);
      }
    }
  } catch (error) {
    console.error("Error handling chat interaction: ", error);
  }
}

// Modal Interaction
async function executeModalInteraction(interaction, jsonUserData) {
  try {
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
  } catch (error) {
    console.error("Error handling modal interaction: ", error);
  }
}

// Helper functions
async function removeMsg(list, interaction) {
  let row = list.get(interaction.user.id);
  if (row) {
    for (let elem of row) {
      try {
        let message = await interaction.channel.messages.fetch(elem);
        await message.delete();
      } catch (error) {
        console.error("Unable to delete messageId: " + elem);
      }
    }
    list.delete(interaction.user.id);
  }
}

function buildCollabsList(collaborators) {
  let select = new StringSelectMenuBuilder()
    .setCustomId("collab_picker")
    .setPlaceholder("Your Collaborators");

  collaborators.forEach((collaborator, index) => {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(
          `${collaborator.name} ${collaborator.surname} (ID: ${collaborator.collaboratorId})`
        )
        .setValue(`analyze_${collaborator.collaboratorId}_${index}`)
    );
  });

  return new ActionRowBuilder().addComponents(select);
}

function getCollabsByUserID(userId, jsonUserData) {
  let user = jsonUserData.users.find((el) => el.userId === userId);
  if (!user) {
    saveNewUserFromDiscord(userId, jsonUserData);
    return [];
  }
  return user.collaborators || [];
}

async function nextQuestionButton(interaction, index) {
  await interaction.followUp({
    content: questions[index].content,
    components: [likertScale],
  });
}

function getUserById(userId, jsonUserData) {
  return jsonUserData.users.find((el) => el.userId === userId);
}

module.exports = {
  executeInteractionSelectMenu,
  executeInteractionButtons,
  executeChatInteraction,
  executeModalInteraction,
};

