// toast.js

const express = require("express");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const { Client, GatewayIntentBits, Routes } = require("discord.js");
const { REST } = require("@discordjs/rest");
const fs = require("fs");

// Import functions and utilities
const {
  saveNewUserFromDiscord,
  saveNewCollaborator,
  updateMap,
  saveNewUserFromWeb,
} = require("./toast.model");

const { commands, gamma, smellsNames } = require("./Utilities/utilities");

const {
  executeInteractionSelectMenu,
  executeInteractionButtons,
  executeChatInteraction,
  executeModalInteraction,
} = require("./toast.service");

// Setup Express application
const app = express();
const port = process.env.PORT || 3000;
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global variable to hold user data
let jsonUserData = {};

// -------------------- SESSION & AUTHENTICATION CONFIGURATION --------------------

// Configure session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "prova1",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport and sessions
app.use(passport.initialize());
app.use(passport.session());

// Passport: Discord Strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// Passport: User serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Middleware to make authenticated user available in templates
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
  }
  next();
});

// -------------------- DISCORD BOT SETUP --------------------

// Start Discord Bot
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

// -------------------- AUTH TOKEN UTILITIES --------------------

function generateAuthToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
  };
  const secretKey = process.env.JWT_SECRET || "yourSecretKey";
  return jwt.sign(payload, secretKey, { expiresIn: "1h" });
}

// Validate JWT token
function validateAuthToken(token) {
  try {
    const secretKey = process.env.JWT_SECRET || "yourSecretKey";
    return jwt.verify(token, secretKey);
  } catch (err) {
    return null;
  }
}

// -------------------- ROUTES --------------------

// Serve static files from the "static" directory
app.use("/static", express.static(path.join(__dirname, "static")));

app.get("/", (req, res) => {
  const htmlFilePath = path.join(__dirname, "templates", "index.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    res.send(data);
  });
});

// Discord OAuth2 login route
app.get("/discord_login", passport.authenticate("discord"));

// Discord OAuth2 callback route
app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    req.session.token = generateAuthToken(req.user);
    res.redirect("/profile");
  }
);

// User profile route
app.get("/profile", ensureAuthenticated, (req, res) => {
  // Prepara la pagina html
  const htmlFilePath = path.join(__dirname, "templates", "personal_area.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    user = req.session.user;
    if (user) {
      // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
      var modifiedData = data
        .replace("{{userid}}", user.userId)
        .replace("{{email}}", user.email)
        .replace("{{username}}", user.username)
        .replace("{{userid}}", user.userId);
    } else {
      // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
      var modifiedData = data
        .replace("{{userid}}", req.user.id)
        .replace("{{email}}", req.user.email)
        .replace("{{username}}", req.user.username)
        .replace("{{userid}}", req.user.id);
    }
    // Invia il contenuto HTML modificato come risposta
    res.send(modifiedData);
  });
});

// Analyze collaborator API
app.post("/analyzeCollaboratorAPI", (req, res) => {
  const interactionData = req.body;
  const userId = "userGenerico";
  const smellValues = ["strDis", "dis", "neutral", "agree", "strAgree"];
  const customIds = [
    interactionData.ans1,
    interactionData.ans2,
    interactionData.ans3,
    interactionData.ans4,
    interactionData.ans5,
    interactionData.ans6,
  ];

  if (customIds.some((field) => !field || !smellValues.includes(field))) {
    return res.status(400).json({
      error:
        "Not all fields have been filled out correctly or have invalid values",
    });
  }
  let simMap = new Map();
  for (let index = 0; index < customIds.length; index++) {
    const fakeInteraction = {
      user: { id: userId },
      customId: customIds[index],
    };
    updateMap(fakeInteraction, index, gamma, simMap);
  }
  let values = simMap.get(userId) || [];
  const smells = Array.from(values, ([smellAcr, smellValue]) => {
    const smellName = smellsNames[smellAcr];
    return { smellName, smellValue };
  });
  res.json({ smells });
});

app.post("/analyze", (req, res) => {
  axios
    .post("http://localhost:3000/analyzeCollaboratorAPI", req.body)
    .then((response) => {
      if (response.status !== 200) {
        console.log("Errore in analyze:", response.error);
        return res
          .status(response.status)
          .json({ error: response.error || "Unknown error occurred" });
      }
      const smells = response.data.smells;
      const htmlFilePath = path.join(__dirname, "templates", "result.html");
      fs.readFile(htmlFilePath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading the HTML file:", err); // Log dell'errore
          return res.status(500).json({ error: "Error reading the file" });
        }
        let modifiedData = data;
        for (let i = 0; i < smells.length; i++) {
          modifiedData = modifiedData.replace(
            `{{r${i + 1}}}`,
            smells[i].smellValue
          );
        }
        for (let i = 0; i < smells.length; i++) {
          modifiedData = modifiedData.replace(
            `{{r${i + 1}}}`,
            smells[i].smellValue
          );
        }
        res.send(modifiedData);
      });
    })
    .catch((error) => {
      if (error.response) {
        console.error(
          "Error analyzing collaborator:",
          error.response.data.error
        );
        return res
          .status(error.response.status)
          .json({ error: error.response.data.error });
      } else {
        console.error("Unknown error analyzing collaborator:", error.message);
        return res
          .status(500)
          .json({ error: "Error analyzing collaborator: " + error.message });
      }
    });
});

//Register route
app.post("/register", async (req, res) => {
  const body = req.body;
  try {
    const result = await saveNewUserFromWeb(body, jsonUserData);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res
      .status(201)
      .json({ message: "Utente registrato con successo", user: result.user });
  } catch (error) {
    console.error("Errore durante la registrazione dell'utente:", error);
    return res
      .status(500)
      .json({ error: "Errore durante la registrazione dell'utente" });
  }
});

app.post("/api/auth", async (req, res) => {
  const { email, psw } = req.body;

  if (!email || !psw) {
    return res.status(400).json({ error: "Email e password sono richiesti" });
  }
  const user = jsonUserData.users.find((user) => user.email === email);

  if (!user) {
    return res.status(400).json({ error: "Email o password non validi" });
  }

  const isPasswordValid = await bcrypt.compare(psw, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ error: "Email o password non validi" });
  }

  const token = generateAuthToken(user);
  res.status(200).json({ id: user.userId, token: token });
});

//standard login
app.post("/standard_login", async (req, res) => {
  const { email, psw } = req.body;
  if (!email || !psw) {
    return res.status(400).json({ error: "Email e password sono richiesti" });
  }
  const user = jsonUserData.users.find((user) => user.email === email);
  if (!user) {
    return res.status(400).json({ error: "Email o password non validi" });
  }
  const isPasswordValid = await bcrypt.compare(psw, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: "Email o password non validi" });
  }
  req.session.user = user;
  req.session.token = generateAuthToken(user);
  res.json({ success: true, redirectUrl: "/profile" });
});

// -------------------- COLLABORATOR ROUTES --------------------

app.post("/newCollaboratorPage", ensureAuthenticated, (req, res) => {
  const htmlFilePath = path.join(
    __dirname,
    "templates",
    "newCollaboratorPage.html"
  );
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    res.send(data);
  });
});

// Rate collaborator route
app.post("/rateCollaborator", ensureAuthenticated, (req, res) => {
  const htmlFilePath = path.join(__dirname, "templates", "assessement.html");
  fs.readFile(htmlFilePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading the file");
      return;
    }
    const { collaboratorid } = req.body;
    if (!collaboratorid) {
      return res.status(400).send("Missing required fields");
    }
    var modifiedData = data.replace("{{collaboratorId}}", collaboratorid);
    res.send(modifiedData);
  });
});

app.post("/saveCollaboratorAPI", (req, res) => {
  var token = req.session.token;
  var userId = req.body.userId;
  var collaboratorId = req.body.collaboratorId;
  var name = req.body.name;
  var surname = req.body.surname;
  if (!token) {
    token = req.body.token;
  }
  if (!validateAuthToken(token)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!userId || !collaboratorId || !name || !surname || !token) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);
  const user = jsonUserData.users.find((user) => user.userId === userId);
  if (
    user &&
    user.collaborators.some((c) => c.collaboratorId === collaboratorId)
  ) {
    return res.status(400).json({ error: "Collaborator already exists" });
  }
  saveNewCollaborator(userId, name, surname, collaboratorId, jsonUserData);
  res.json({
    success: true,
    message: `Collaboratore con id: ${collaboratorId} aggiunto correttamente`,
    collaborator: { id: collaboratorId, name, surname },
  });
});

// Save collaborator API
app.post("/saveCollaboratorAPI", (req, res) => {
  var token = req.session.token;
  var userId = req.body.userId;
  var collaboratorId = req.body.collaboratorId;
  var name = req.body.name;
  var surname = req.body.surname;

  if (!token) {
    token = req.body.token;
  }

  if (!validateAuthToken(token)) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!userId || !collaboratorId || !name || !surname || !token) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);
  const user = jsonUserData.users.find((user) => user.userId === userId);

  if (
    user &&
    user.collaborators.some((c) => c.collaboratorId === collaboratorId)
  ) {
    return res.status(400).json({ error: "Collaborator already exists" });
  }

  saveNewCollaborator(userId, name, surname, collaboratorId, jsonUserData);
  res.json({
    success: true,
    message: `Collaboratore con id: ${collaboratorId} aggiunto correttamente`,
    collaborator: { id: collaboratorId, name, surname },
  });
});

// Add collaborators route
app.post("/addCollaborator", ensureAuthenticated, (req, res) => {
  req.body.token = req.session.token;
  const user = req.session.user;

  if (user) {
    req.body.userId = user.userId;
  } else {
    req.body.userId = req.user.id;
  }

  axios
    .post("http://localhost:3000/saveCollaboratorAPI", req.body)
    .then((response) => {
      // Success response, return JSON to client
      res.json({
        success: true,
        message: response.data.message,
        collaborator: response.data.collaborator,
      });
    })
    .catch((err) => {
      // Handle error response
      if (err.response) {
        res
          .status(400)
          .json({ error: err.response.data.error || "Errore sconosciuto" });
      } else {
        res.status(400).json({ error: "Errore durante la richiesta" });
      }
    });
});

// Collaborator retrieval
app.get("/getCollaborators", ensureAuthenticated, (req, res) => {
  const userData = fs.readFileSync("users.json", "utf8");
  const jsonUserData = JSON.parse(userData);
  user_session = req.session.user;
  if (user_session) {
    user = jsonUserData.users.find(
      (user) => user.userId === req.session.user.userId
    );
  } else {
    user = jsonUserData.users.find((user) => user.userId === req.user.id);
  }
  if (user) {
    res.json({ userId: user.userId, collaborators: user.collaborators });
  } else {
    res.status(404).send("User not found");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// -------------------- MIDDLEWARES --------------------

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated() || req.session.user) {
    return next();
  }
  res.redirect("/");
}

// -------------------- START SERVER --------------------

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startBot(); // Start the Discord bot
});
