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

//rotta per analizzare un collaboraotre 
app.post("/analyze", (req, res) => {
  // Ottieni i dati dal body della richiesta
  const interactionData = req.body;
  // Estrai i valori dal body
  const userId = interactionData.collaboratorId;
  const customIds = [
      interactionData.ans1,
      interactionData.ans2,
      interactionData.ans3,
      interactionData.ans4,
      interactionData.ans5,
      interactionData.ans6
  ];

  // Creazione della mappa per simulare le interazioni
  let simMap = new Map();

  // Crea un'interazione fittizia per ogni risposta
  for (let index = 0; index < customIds.length; index++) {
      const fakeInteraction = {
          user: {
              id: userId,
          },
          customId: customIds[index]
      };
      // Aggiorna la mappa
      updateMap(fakeInteraction, index, gamma, simMap);
  }

  // Estrai i dati del collaboratore analizzato
  let values = simMap.get(userId) || [];

  // Crea un array di oggetti smell 
  const smells = Array.from(values, ([smellAcr, smellValue]) => {
      const smellName = smellsNames[smellAcr]; // Assumendo che `smellsNames` sia definito
      return { smellName, smellValue };
  });
  //preparo il file html con i risultati 
  const htmlFilePath = path.join(__dirname, "templates", "result.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
     // Sostituzione dei segnaposti nel contenuto HTML con i risultati dell'analisi
     var modifiedData = data.replace("{{r1}}",smells[0].smellValue).replace("{{r2}}", 
      smells[1].smellValue).replace("{{r3}}", smells[2].smellValue);

     // Invia il contenuto HTML modificato come risposta
     res.send(modifiedData);
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
    res.redirect("/profile");
  }
);

// Rotta per il profilo dell'utente autenticato
app.get("/profile", ensureAuthenticated, (req, res) => {
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
  //preparo la pagina
  const htmlFilePath = path.join(__dirname, "templates", "newCollaboratorPage.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    //prendo lo userId dalla richiesta
    const {userId} = req.body;
     // Sostituzione di un segnaposto nel contenuto HTML con il valore di userId
     var modifiedData = data.replace("{{userId}}",userId);
     // Invia il contenuto HTML modificato come risposta
     res.send(modifiedData);
  });
});

// Rotta per ottenre la pagina html che permette la valutazione del collaboratore
app.get('/rateCollaborator', (req, res) => {
  //preparo la pagina html
  const htmlFilePath = path.join(__dirname, 'templates', 'assessement.html');
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    //estraggo i parametri passati dalla richiesta 
    var url_parts = require('url').parse(req.url, true);

     // Sostituzione dei segnaposti nel contenuto HTML con l'ide del collaboratore e quello dell'utente
     var modifiedData = data.replace("{{userId}}",url_parts.query.userid).replace("{{collaboratorId}}", 
      url_parts.query.collaboratorid);

     // Invia il contenuto HTML modificato come risposta
     res.send(modifiedData);

});
});

// Rotta per aggiungere collaboratori
app.post("/addCollaborator", ensureAuthenticated, (req, res) => {
  // Ottieni i parametri dal corpo della richiesta POST
  const { userId, collaboratorId, name, surname } = req.body;
  // Verifica che tutti i parametri siano stati ricevuti
  if (!userId || !collaboratorId || !name || !surname) {
      return res.status(400).send("Missing required fields"+userId+collaboratorId+name+surname);
  }
  // Leggi il file locale con tutti gli utenti
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);

  // Salva il nuovo collaboratore 
  saveNewCollaborator(userId, name, surname, collaboratorId, jsonUserData);
  
  const htmlFilePath = path.join(__dirname, "templates", "personal_area.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
  var modifiedData = data.replace("{{userid}}", res.locals.user.id)
                           .replace("{{email}}", res.locals.user.email)
                           .replace("{{username}}", res.locals.user.username)
                           .replace("{{message}}", "Collaboratore con id:"+ collaboratorId + " aggiunto correttamente");
  res.send(modifiedData);
  //res.redirect('/profile');
});
});

// Rotta per tornare alla home
app.get("/backHome", ensureAuthenticated, (req, res) => {
  const htmlFilePath = path.join(__dirname, "templates", "personal_area.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
  var modifiedData = data.replace("{{userid}}", res.locals.user.id)
                           .replace("{{email}}", res.locals.user.email)
                           .replace("{{username}}", res.locals.user.username);
  res.send(modifiedData);
});
});

// Rotta per ricavare i collaboratori dell'utente
app.get("/getCollaborators", ensureAuthenticated, (req, res) => {
  //leggo il file con tutti gli utenti 
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);
   //cerco l'utente in base all'id
   const user = jsonUserData.users.find(user => user.userId === req.user.id);
   //invio i dati dell'utente e i suoi collaboratori 
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
