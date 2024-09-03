const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const {
  saveNewUser,
  saveNewCollaborator,
  updateMap,
} = require("./toast.model");
const {
  Client,
  GatewayIntentBits,
  Routes,
  ButtonInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  getUserAgentAppendix,
} = require("discord.js");

const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

const { REST } = require("@discordjs/rest");

const {
  commands,
  questions,
  gamma,
  smellsNames,
} = require("./Utilities/utilities");

const fs = require("fs");

const {
  executeInteractionSelectMenu,
  executeInteractionButtons,
  executeChatInteraction,
  executeModalInteraction,
} = require("./toast.service");

const app = express();
const port = process.env.PORT || 3000;;
const filePath = path.join(__dirname, "data.json");
app.use(express.json());
dotenv.config();

// Variabile globale per i dati degli utenti
let jsonUserData = {};

// Configura express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'prova1',
  resave: false,
  saveUninitialized: false,
}));

// Inizializza Passport e la sessione
app.use(passport.initialize());
app.use(passport.session());

// Middleware per impostare l'utente autenticato come variabile locale
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
  }
  next();
});

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ['identify', 'guilds'],
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Access Token:", accessToken);
      console.log("Refresh Token:", refreshToken);
      console.log("Profile:", profile);
      return done(null, profile);
    }
  )
);

// Debugging della risposta per capire cosa va storto
function parseErrorResponse(body, status) {
  console.log("Errore durante il parsing della risposta:", body);
  return OAuth2Strategy.prototype.parseErrorResponse.call(this, body, status);
}


// Serializzazione e deserializzazione dell'utente
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj))

// Avvio del bot Discord
async function startBot() {
  let interactionInProgress = false;
  global.index = 0;
  let smellValues = new Map();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  global.messagesIds = new Map();
  global.choicesIds = new Map();
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands,
      }
    );

    client.login(process.env.DISCORD_TOKEN).then(() => {
      console.log("Bot is ready");
      const data = fs.readFileSync("users.json", "utf8");
      jsonUserData = JSON.parse(data);
    });

    client.on("interactionCreate", async (interaction) => {
      console.log("id " + interaction.id);
      console.log("username " + interaction.user.username);
      console.log("channelId " + interaction.channelId);
      console.log("userId " + interaction.user.id);

      // if the interaction is a command (/start) and the bot is not already interacting with the user
      if (interaction.isChatInputCommand()) {
        await executeChatInteraction(interaction, jsonUserData);
      }
      // if the interaction is a button interaction
      else if (interaction.isButton()) {
        await executeInteractionButtons(smellValues, interaction);
        console.log("mario"+ interaction.customId);
      }
      // if the interaction is a select menu interaction
      else if (interaction.isStringSelectMenu()) {
        await executeInteractionSelectMenu(interaction, jsonUserData);
      }
      // else, if the interaction is a modal interaction (and so it is processing the data of the new collaborator)
      else if (interaction.isModalSubmit()) {
        await executeModalInteraction(interaction, jsonUserData);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

// Utilizzato per chiamare le rotte che fanno da API
const axios = require('axios'); 

// Utilizzato per la gestione dei token
const jwt = require('jsonwebtoken');

function generateAuthToken(user) {
    // Definisci un payload che contiene le informazioni dell'utente
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email
    };

    // Firma il token con una chiave segreta
    const secretKey = 'yourSecretKey'; 
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    return token;
}

// Funzione per verificare il token
function validateAuthToken(token) {
  try {
      const secretKey = 'yourSecretKey'; 
      const decoded = jwt.verify(token, secretKey);
      return decoded;
  } catch (err) {
      return null;
  }
}

// Avvio del server Express e del bot Discord
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startBot(); // Avvia il bot quando il server è avviato
});

app.get("/", (req, res) => {
  const htmlFilePath = path.join(__dirname, "templates", "index.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    res.send(data); // Invia il contenuto HTML come risposta
  });
});

app.use(express.urlencoded({ extended: true }));

// API per analizzare il collaboratore e restituire i dati in JSON
app.post("/analyzeCollaboratorAPI", (req, res) => {
  const interactionData = req.body;
  const userId = "userGenerico";
  const customIds = [
      interactionData.ans1,
      interactionData.ans2,
      interactionData.ans3,
      interactionData.ans4,
      interactionData.ans5,
      interactionData.ans6
  ];
  // Verifica che tutti i parametri siano stati ricevuti
  for (let index = 0; index < customIds.length; index++) {
      if (!customIds[index]) {
           console.log("sono nel for"+index);
          return res.status(400).json({ error: "Missing required fields" });
      }
  }

  // Creazione della mappa per simulare le interazioni
  let simMap = new Map();

  // Crea un'interazione fittizia per ogni risposta
  for (let index = 0; index < customIds.length; index++) {
      const fakeInteraction = {
          user: { id: userId },
          customId: customIds[index]
      };
      // Aggiorna la mappa
      updateMap(fakeInteraction, index, gamma, simMap);
  }

  // Estrai i dati del collaboratore analizzato
  let values = simMap.get(userId) || [];

  // Crea un array di oggetti smell 
  const smells = Array.from(values, ([smellAcr, smellValue]) => {
      const smellName = smellsNames[smellAcr]; 
      return { smellName, smellValue };
  });

  // Restituisci i risultati dell'analisi in formato JSON
  res.json({ smells });
});

// Rotta per analizzare il collaboratore e preparare la risposta HTML
app.post("/analyze", (req, res) => {
  // Invia la richiesta alla rotta /analyzeCollaborator per eseguire l'analisi
  axios.post("http://localhost:3000/analyzeCollaboratorAPI", req.body)
      .then(response => {
          const smells = response.data.smells;

          // Prepara il file HTML con i risultati dell'analisi
          const htmlFilePath = path.join(__dirname, "templates", "result.html");
          fs.readFile(htmlFilePath, "utf8", (err, data) => {
              if (err) {
                  return res.status(500).send("Error reading the file");
              }

              // Sostituzione dei segnaposti nel contenuto HTML con i risultati dell'analisi
              let modifiedData = data;
              for (let i = 0; i < smells.length; i++) {
                  modifiedData = modifiedData.replace(`{{r${i + 1}}}`, smells[i].smellValue);
              }
              for (let i = 0; i < smells.length; i++) {
                modifiedData = modifiedData.replace(`{{r${i + 1}}}`, smells[i].smellValue);
            }

              // Invia il contenuto HTML modificato come risposta
              res.send(modifiedData);
          });
      })
      .catch(err => {
          res.status(500).send("Error analyzing collaborator");
      });
});

// Rotta per leggere e restituire il contenuto del file JSON
app.get("/newUser", (req, res) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }

    // Parse dei dati JSON
    const jsonData = JSON.parse(data);

    // Assegna un ID univoco a ciascun utente
    jsonData.users.forEach((user) => {
      user.id = generateId();
    });

    // Stampa dei dati sulla console
    console.log(jsonData);

    // Restituisce i dati JSON aggiornati come risposta
    res.json(jsonData);
  });
});

// Rotta per il login con Discord
app.get("/login", passport.authenticate("discord"));

// Callback di Discord OAuth2
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    // Viene aggiunto alla sessione un token per le app esterne autenticate
    req.session.token = generateAuthToken(req.user);
    res.redirect("/profile");
  }
);

// Rotta per il profilo dell'utente autenticato
app.get("/profile", ensureAuthenticated, (req, res) => {
  // Prepara la pagina html
  const htmlFilePath = path.join(__dirname, "templates", "personal_area.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
    var modifiedData = data.replace("{{userid}}",req.user.id).replace("{{email}}", 
    req.user.email).replace("{{username}}", req.user.username).replace("{{userid}}",req.user.id);

    // Invia il contenuto HTML modificato come risposta
    res.send(modifiedData);
  });
});

// Rotta per ottenre la pagina che consente l'aggiunta di un nuovo collaboratore
app.post("/newCollaboratorPage", ensureAuthenticated, (req, res) => {
  // Prepara la pagina
  const htmlFilePath = path.join(__dirname, "templates", "newCollaboratorPage.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
     // Invia il contenuto HTML 
     res.send(data);
  });
});

// Rotta per ottenre la pagina html che permette la valutazione del collaboratore
app.post("/rateCollaborator", ensureAuthenticated, (req, res) => {
  // Prepara la pagina html
  const htmlFilePath = path.join(__dirname, 'templates', 'assessement.html');
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    // Estrai i parametri passati dalla richiesta 
    const {collaboratorid} = req.body;
    // Verifica che tutti i parametri siano stati ricevuti
    if (!collaboratorid) {
      return res.status(400).send("Missing required fields");
    }
     // Sostituzione dei segnaposti nel contenuto HTML con l'id del collaboratore e quello dell'utente
    var modifiedData = data.replace("{{collaboratorId}}", collaboratorid);

     // Invia il contenuto HTML modificato come risposta
    res.send(modifiedData);
});
});

// Pagina per simulare app esterna che usa l'api per l'analisi 
app.get("/externalRateCollaborator", (req, res) => {
  // Prepara la pagina html
  const htmlFilePath = path.join(__dirname, 'templates', 'externalAssessement.html');
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
     // Invia il contenuto HTML modificato come risposta
     res.send(data);
});
});

// API per salvare il collaboratore e restituire i dati in JSON
app.post("/saveCollaboratorAPI", (req, res) => {
  // Token per le app esterne 
  var token = req.session.token;
  // Estrai gli altri parametri 
  var userId = req.body.userId;
  var collaboratorId = req.body.collaboratorId;
  var name = req.body.name;
  var surname = req.body.surname;

  if(!token){
    // L'app web utilizza un token passato nella richiesta 
    token = req.body.token;
  }
  // Funzione per validare il token
  if (!validateAuthToken(token)) { 
    return res.status(401).json({ success: false, message: "Autenticazione richiesta" });
  }
  // Verifica che tutti i parametri siano stati ricevuti
  if (!userId || !collaboratorId || !name || !surname || !token) {
      return res.status(400).json({ error: "Missing required fields" });
  }

  // Leggi il file locale con tutti gli utenti
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);

  // Salva il nuovo collaboratore
  saveNewCollaborator(userId, name, surname, collaboratorId, jsonUserData);

  // Restituisci un JSON con i dettagli del collaboratore aggiunto
  res.json({
      success: true,
      message: `Collaboratore con id: ${collaboratorId} aggiunto correttamente`,
      collaborator: {
          id: collaboratorId,
          name: name,
          surname: surname
      }
  });
});

// Rotta principale per aggiungere collaboratori e preparare la risposta HTML
app.post("/addCollaborator", ensureAuthenticated, (req, res) => {
  // Genera un token per utilizzare l'API 
  const authToken = generateAuthToken(req.user); 
  // Aggiungi il token e l'id dell'utente al body della richiesta
  req.body.token = authToken; 
  req.body.userId = req.user.id; 
  // Invia la richiesta alla rotta /saveCollaboratorAPI per salvare il collaboratore
  axios.post("http://localhost:3000/saveCollaboratorAPI", req.body)
      .then(response => {
          // Estrai i dati JSON dalla risposta
          const { collaborator, message } = response.data;

          // Prepara la home con un messaggio che conferma l'aggiunta del collaboratore
          const htmlFilePath = path.join(__dirname, "templates", "personal_area.html");
          fs.readFile(htmlFilePath, "utf8", (err, data) => {
              if (err) {
                  return res.status(500).send("Error reading the file");
              }
              // Sostituzione dei segnaposti nel contenuto HTML con i dati dell'utente e il messaggio
              var modifiedData = data.replace("{{userid}}", req.user.id)
                                     .replace("{{email}}", req.user.email)
                                     .replace("{{username}}", req.user.username)
                                     .replace("{{message}}", message);
              
              // Invia il contenuto HTML modificato come risposta
              res.send(modifiedData);
          });
      })
      .catch(err => {
          res.status(500).send("Error saving collaborator");
      });
});

// Pagina per simulare app esterna che salva un collaboratore (autenticazione richiesta)
app.get("/externalAddCollaborator" ,(req, res) => {
  // Prepara la pagina html
  const htmlFilePath = path.join(__dirname, 'templates', 'externalNewCollaboratorPage.html');
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
     // Invia il contenuto HTML modificato come risposta
     res.send(data);
});
});

// Rotta per ricavare i collaboratori dell'utente
app.get("/getCollaborators", ensureAuthenticated, (req, res) => {
  // Leggi il file con tutti gli utenti 
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);
   // Cerca l'utente in base all'id
   const user = jsonUserData.users.find(user => user.userId === req.user.id);
   // Invia i dati dell'utente e i suoi collaboratori 
   if (user) {
    res.json({ userId: req.user.id, collaborators: user.collaborators });
   } else {
    res.status(404).send("User not found");
   }
});

// Logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Middleware per verificare se l'utente è autenticato
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
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
