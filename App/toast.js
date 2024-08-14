const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
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

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "email", "guilds"],
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
  res.send(`<h1>Hello, ${req.user.username}!</h1><pre>${JSON.stringify(req.user, null, 2)}</pre>`);
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
