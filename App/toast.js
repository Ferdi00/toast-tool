const express = require("express");
const dotenv = require("dotenv");
const axios = require('axios'); 
const jwt = require('jsonwebtoken');
const path = require("path");
const {
  saveNewUserFromDiscord,
  saveNewCollaborator,
  updateMap,
  saveNewUserFromWeb,
} = require("./toast.model");
const {
  Client,
  GatewayIntentBits,
  Routes,
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


// Serve static files from the "static" directory
app.use('/static', express.static(path.join(__dirname, 'static')));

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



  // Verifica se almeno uno dei campi è undefined
  if (customIds.some((field) => field === undefined || field === "")) {
    return res
      .status(400)
      .json({ error: "Not all fields have been filled out correctly" });
  }

  // Verifica il formato dei campi
  for (let index = 0; index < customIds.length; index++) {
    if (!smellValues.includes(customIds[index])) {
      return res
        .status(400)
        .json({ error: "Invalid format for one or more fields" });
    }
  }

  // Creazione della mappa per simulare le interazioni
  let simMap = new Map();

  // Crea un'interazione fittizia per ogni risposta
  for (let index = 0; index < customIds.length; index++) {
    const fakeInteraction = {
      user: { id: userId },
      customId: customIds[index],
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

        res.send(modifiedData);
      });
    })
    .catch((error) => {
      // Cattura l'errore della chiamata axios
      if (error.response) {
        // Risposta ricevuta con errore dall'API analyzeCollaboratorAPI
        console.error(
          "Error analyzing collaborator:",
          error.response.data.error
        );
        return res
          .status(error.response.status)
          .json({ error: error.response.data.error });
      } else {
        // Errore sconosciuto o di rete
        console.error("Unknown error analyzing collaborator:", error.message);
        return res
          .status(500)
          .json({ error: "Error analyzing collaborator: " + error.message });
      }
    });
});




// Rotta per il login con Discord
app.get("/discord_login", passport.authenticate("discord"));

app.post("/api/auth", (req, res) => {
  const { email, psw } = req.body; // Estrae email e password dal corpo della richiesta

  // Controlla se entrambi i campi sono stati forniti
  if (!email || !psw) {
    return res.status(400).json({ error: "Email e password sono richiesti" });
  }

  // Cerca l'utente nel file jsonUserData in base all'email
  const user = jsonUserData.users.find((user) => user.email === email);

  // Se l'utente non è stato trovato
  if (!user || user.password !== psw) {
    return res.status(400).json({ error: "Email o password non validi" });
  }

  const token = generateAuthToken(user);
  res.status(200).json({ id:user.userId, token: token });
});


app.post("/standard_login", (req, res) => {
  const { email, psw } = req.body;

  if (!email || !psw) {
    return res.status(400).json({ error: "Email e password sono richiesti" });
  }

  const user = jsonUserData.users.find((user) => user.email === email);

  if (!user || user.password !== psw) {
    return res.status(400).json({ error: "Email o password non validi" });
  }

  req.session.user = user; 
  req.session.token = generateAuthToken(user);

  // Invia una risposta JSON che indica il successo
  res.json({ success: true, redirectUrl: "/profile" });
});




app.post("/register", async (req, res) => {
  const body = req.body;
 
  // Chiama la funzione per salvare il nuovo utente
  try {
    const result = await saveNewUserFromWeb(body, jsonUserData); // Usa await per la funzione asincrona

    if (result.error) {
      return res.status(400).json({ error: result.error }); // Se c'è un errore, restituiscilo al client
    }

    return res
      .status(201)
      .json({ message: "Utente registrato con successo", user: result.user }); // Invia successo
  } catch (error) {
    console.error("Errore durante la registrazione dell'utente:", error); // Log dell'errore
    return res
      .status(500)
      .json({ error: "Errore durante la registrazione dell'utente" }); // Invia errore server
  }
});

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
    user = req.session.user;
    if (user) {
      // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
      var modifiedData = data
        .replace("{{userid}}", user.userId)
        .replace("{{email}}", user.email)
        .replace("{{username}}", user.username)
        .replace("{{userid}}", user.userId);
    }
    else {
      // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
    var modifiedData = data.replace("{{userid}}",req.user.id).replace("{{email}}", 
    req.user.email).replace("{{username}}", req.user.username).replace("{{userid}}",req.user.id);
    } 
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
    return res.status(401).json({ error: "Authentication required" });
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
  
  req.body.token = req.session.token; 
 
  user = req.session.user;
  if (user) {
    req.body.userId = req.session.user.userId;
  } else {
    req.body.userId = req.user.id;
  } 

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
              
               if (user) {
                 // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
                 var modifiedData = data
                   .replace("{{userid}}", user.userId)
                   .replace("{{email}}", user.email)
                   .replace("{{username}}", user.username)
                   .replace("{{userid}}", user.userId)
                 .replace("{{message}}", message);
               } else {
                 // Sostituzione di un segnaposto nel contenuto HTML con il valore di req.userId
                 var modifiedData = data
                   .replace("{{userid}}", req.user.id)
                   .replace("{{email}}", req.user.email)
                   .replace("{{username}}", req.user.username)
                   .replace("{{userid}}", req.user.id)
                  .replace("{{message}}", message);
               } 
          
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
  user_session = req.session.user;
  
  if (user_session) {
      user = jsonUserData.users.find(
       (user) => user.userId === req.session.user.userId
     );
  } else {
     user = jsonUserData.users.find(
      (user) =>
        user.userId === req.user.id
    );
   } 
   if (user) {
     res.json({ userId: user.userId, collaborators: user.collaborators });
     
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
  // Controlla se l'utente è autenticato tramite Passport o se è presente nella sessione
  if (req.isAuthenticated() || req.session.user) {
    return next(); // L'utente è autenticato
  }
  res.redirect("/");
}
