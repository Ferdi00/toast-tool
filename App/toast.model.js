const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require("path");

const { questions } = require("./Utilities/utilities");

const USERS_FILE_PATH = path.resolve(__dirname, "users.json");

// Funzione per scrivere in modo sicuro su un file
function writeToFile(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 4), "utf8", (err) => {
      if (err) {
        reject(new Error("Errore durante la scrittura del file"));
      } else {
        resolve();
      }
    });
  });
}

// Crittografia sicura della password
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Funzione sicura per generare ID unici
function generateSecureId() {
  return crypto.randomBytes(10).toString("hex");
}

async function saveNewUserFromDiscord(userId, jsonUserData) {
  if (!jsonUserData || !jsonUserData.users) {
    console.error(
      'jsonUserData non è definito o non contiene la proprietà "users"'
    );
    return null;
  }

  let newUser = { userId: userId, collaborators: [] };
  jsonUserData.users.push(newUser);

  try {
    await writeToFile(USERS_FILE_PATH, jsonUserData);
    return newUser;
  } catch (error) {
    console.error(
      "Errore durante l'aggiunta di un nuovo utente del file:",
      error
    );
    return null;
  }
}

async function saveNewUserFromWeb(body, jsonUserData) {
  const { username, email, password } = body;

  if (!username || !email || !password) {
    return { error: "Dati non validi" };
  }

  const emailExists = jsonUserData.users.some((user) => user.email === email);

  if (emailExists) {
    return { error: "L'email è già registrata" };
  }

  let newUserId = generateSecureId();
  while (jsonUserData.users.some((user) => user.userId === newUserId)) {
    newUserId = generateSecureId();
  }

  const hashedPassword = await hashPassword(password);

  let newUser = {
    userId: newUserId,
    username: username,
    email: email,
    password: hashedPassword,
    collaborators: [],
  };

  jsonUserData.users.push(newUser);

  try {
    await writeToFile(USERS_FILE_PATH, jsonUserData);
    return { success: true, user: newUser };
  } catch (error) {
    return { error: "Errore durante la scrittura del file" };
  }
}

function updateMap(interaction, index, gamma, smellValues) {
  let userSmell = smellValues.get(interaction.user.id) || new Map();
  smellValues.set(interaction.user.id, userSmell);

  let prevValue = userSmell.get(questions[index].smell) || 0;
  let value =
    gamma[interaction.customId].value * questions[index].weight + prevValue;
  userSmell.set(questions[index].smell, value);
}

async function saveNewCollaborator(userId, name, surname, id, jsonUserData) {
  if (!jsonUserData || !jsonUserData.users) {
    console.error(
      'jsonUserData non è definito o non contiene la proprietà "users"'
    );
    return;
  }

  let user = jsonUserData.users.find((el) => el.userId === userId);

  if (!user) {
    console.error("Utente non trovato" + userId);
    return;
  }

  let collaborator = { name: name, surname: surname, collaboratorId: id };
  user.collaborators.push(collaborator);

  try {
    await writeToFile(USERS_FILE_PATH, jsonUserData);
    console.log("Collaboratore aggiunto con successo!");
  } catch (error) {
    console.error("Errore durante l'aggiunta del collaboratore:", error);
  }
}

module.exports.saveNewUserFromDiscord = saveNewUserFromDiscord;
module.exports.saveNewUserFromWeb = saveNewUserFromWeb;
module.exports.updateMap = updateMap;
module.exports.saveNewCollaborator = saveNewCollaborator;
