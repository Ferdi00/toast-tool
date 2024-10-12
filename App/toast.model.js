const fs = require("fs");
const { questions } = require("./Utilities/utilities");

function saveNewUserFromDiscord(userId, jsonUserData) {
  if (!jsonUserData || !jsonUserData.users) {
    console.error(
      'jsonUserData non è definito o non contiene la proprietà "users"'
    );
    return null; // o gestisci l'errore in modo appropriato per la tua logica
  }

  let newUser = { userId: userId, collaborators: [] };
  jsonUserData.users.push(newUser);
  
  const jsonString = JSON.stringify(jsonUserData, null, 4);

  fs.writeFile("users.json", jsonString, "utf8", (err) => {
    if (err) {
      console.error(
        "Errore durante l'aggiunta di un nuovo utente del file:",
        err
      );
    } 
  });
  return newUser;
}

function saveNewUserFromWeb(body, jsonUserData) {
  if (!jsonUserData || !jsonUserData.users) {
    console.error(
      'jsonUserData non è definito o non contiene la proprietà "users"'
    );
    return null; // o gestisci l'errore in modo appropriato per la tua logica
  }

  const { username, email, password } = body;


  let emailExists = false;
  for (const user of jsonUserData.users) {
    if (user.email && user.email === email) {
      emailExists = true;
      break; // Esci dal loop non appena trovi l'email
    }
  }

  if (emailExists) {
    console.error("L'email è già registrata.");
    return { error: "L'email è già registrata" };
  }

  // Genera un nuovo ID per l'utente usando la funzione generateId()
  const newUserId = generateId();

  // Verifica che l'ID non sia già presente tra gli utenti esistenti
  while (jsonUserData.users.some((user) => user.userId === newUserId)) {
    newUserId = generateId(); // Rigenera l'ID finché non ne troviamo uno univoco
  }

  // Crea un nuovo oggetto utente con i dati del body e il nuovo ID
  let newUser = {
    userId: newUserId,
    username: username,
    email: email,
    password: password, // Dovresti crittografare la password prima di salvarla
    collaborators: [],
  };

  // Aggiungi il nuovo utente all'array degli utenti
  jsonUserData.users.push(newUser);

  // Converte i dati aggiornati in stringa JSON
  const jsonString = JSON.stringify(jsonUserData, null, 4);


  // Scrive il nuovo JSON nel file users.json e gestisce eventuali errori
  return new Promise((resolve, reject) => {
    fs.writeFile("users.json", jsonString, "utf8", (err) => {
      if (err) {
        console.error(
          "Errore durante l'aggiunta di un nuovo utente al file:",
          err
        );
        reject({ error: "Errore durante la scrittura del file" });
      } else {
        resolve({ success: true, user: newUser });
      }
    });
  });
}


function updateMap(interaction, index, gamma, smellValues) {
  let userSmell = smellValues.get(interaction.user.id);
  if (userSmell === undefined) {
    userSmell = new Map();
    smellValues.set(interaction.user.id, userSmell);
  }

  let prevValue = userSmell.get(questions[index].smell) || 0;
  let value =
    gamma[interaction.customId].value * questions[index].weight + prevValue;
  userSmell.set(questions[index].smell, value);
  
}

function saveNewCollaborator(userId, name, surname, id, jsonUserData) {
  if (!jsonUserData || !jsonUserData.users) {
    console.error(
      'jsonUserData non è definito o non contiene la proprietà "users"'
    );
    return; // o gestisci l'errore in modo appropriato per la tua logica
  }
  
  let user = jsonUserData.users.find((el) => {
    return el.userId === userId;
  });

  if (!user) {
    console.error("Utente non trovato" + userId);
    return; // o gestisci l'errore in modo appropriato per la tua logica
  }

  let collaborator = { name: name, surname: surname, collaboratorId: id };

  user.collaborators.push(collaborator);
  const jsonString = JSON.stringify(jsonUserData, null, 4);

  fs.writeFile("users.json", jsonString, "utf8", (err) => {
    if (err) {
      console.error(
        "Errore durante l'aggiunta di un nuovo utente del file:",
        err
      );
    } else {
      console.log("Nuovo utente aggiunto con successo!");
    }
  });
}

function generateId() {
  const characters = "0123456789";
  const length = 20;
  let id = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id += characters[randomIndex];
  }

  return id;
}


module.exports.saveNewUserFromDiscord = saveNewUserFromDiscord;
module.exports.saveNewUserFromWeb = saveNewUserFromWeb;
module.exports.updateMap = updateMap;
module.exports.saveNewCollaborator = saveNewCollaborator;
