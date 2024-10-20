const axios = require("axios");

const apiBaseURL = "http://localhost:3000";


describe("User Response Analysis API Tests", () => {
  
  it("should analyze user responses with correct input (TC-AN-1)", async () => {
    const userResponses = {
      ans1: "dis",
      ans2: "neutral",
      ans3: "agree",
      ans4: "dis",
      ans5: "agree",
      ans6: "dis"
    };

    const response = await axios.post(`${apiBaseURL}/analyzeCollaboratorAPI`, userResponses);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      smells: [
        {
          smellName: "Lone Wolf",
          smellValue: 0,
        },
        {
          smellName: "Prima Donna",
          smellValue: 2.3508905,
        },
        {
          smellName: "Black Cloud",
          smellValue: 1.7881185,
        },
      ],
    });
  });

  it("should return error for missing responses (TC-AN-2)", async () => {
    const incompleteResponses = {
      ans1: "dis",
      ans2: "",
      ans3: "agree",
      ans4: "dis",
      ans5: "agree",
      ans6: ""
    };

    try {
      await axios.post(`${apiBaseURL}/analyzeCollaboratorAPI`, incompleteResponses);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe(
        "Not all fields have been filled out correctly or have invalid values"
      );
    }
  });

  it("should return error for invalid JSON format (TC-AN-3)", async () => {
    const invalidData = "Questo non è un JSON valido";

    try {
      await axios.post(`${apiBaseURL}/analyzeCollaboratorAPI`, invalidData);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe(
        "Not all fields have been filled out correctly or have invalid values"
      );
    }
  });
});

const loginData = {
  email: "marioRisi@gmail.com",
  psw: "12349087",
};

//API per l'aggiunta dei collaboratori 
it("should add a new collaborator correctly (TC-ADD.1)", async () => {
  // Step 1: Authenticate the user via /api/auth to get the token
 
  const authResponse = await axios.post(`${apiBaseURL}/api/auth`, loginData);
  expect(authResponse.status).toBe(200);
  const token = authResponse.data.token; // Extract the token
  const id = authResponse.data.id; // Extract the id

  // Step 2: Send request to add a new collaborator with correct data
  const newCollaborator = {
    userId:id, // Pass the userId
    token: token, // Pass the token
    collaboratorId: "12", // Valid collaboratorId
    name: "Mario",
    surname: "Rossi",
  };

  const response = await axios.post(
    `${apiBaseURL}/saveCollaboratorAPI`,
    newCollaborator
  );
  expect(response.status).toBe(200); // Success
  expect(response.data.success).toBe(true); // Expect success to be true
  expect(response.data.message).toBe("Collaboratore con id: 12 aggiunto correttamente");
  expect(response.data.collaborator).toEqual({
    id: "12",
    name: "Mario",
    surname: "Rossi",
  }); // Check that the correct collaborator data is returned
});

it("should return error for missing collaboratorId (TC-ADD.2)", async () => {
  // Step 1: Authenticate the user via /api/auth to get the token
  const authResponse = await axios.post(`${apiBaseURL}/api/auth`, loginData);
  expect(authResponse.status).toBe(200);
  const token = authResponse.data.token; // Extract the token
  const id = authResponse.data.id; // Extract the id
  // Step 2: Send request with missing collaboratorId
  const newCollaborator = {
    userId:id, // Pass the userId
    token: token, // Pass the token
    collaboratorId: "", // Missing collaboratorId
    name: "Mario",
    surname: "Rossi",
  };

  try {
    await axios.post(`${apiBaseURL}/saveCollaboratorAPI`, newCollaborator);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.error).toBe("Missing required fields");
  }
});

it("should return error for invalid format (TC-ADD.3)", async () => {
  // Step 1: Authenticate the user via /api/auth to get the token

  const authResponse = await axios.post(`${apiBaseURL}/api/auth`, loginData);
  expect(authResponse.status).toBe(200);
  const token = authResponse.data.token; // Extract the token
  const id = authResponse.data.id; // Extract the id
  // Step 2: Send request with invalid name format
  const newCollaborator = {
    userId:id, // Pass the userId
    token: token, // Pass the token
    collaboratorId: "15",
    name: "123", // Invalid name format
    surname: "Rossi",
  };

  try {
    await axios.post(`${apiBaseURL}/saveCollaboratorAPI`, newCollaborator);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.error).toBe("Invalid format");
  }
});

it("should return error for invalid token (TC-ADD.4)", async () => {
  // Send request with an invalid token
  const newCollaborator = {
    token: "12345", // Invalid token
    collaboratorId: "16",
    name: "Mario",
    surname: "Rossi",
  };
  try {
    await axios.post(`${apiBaseURL}/saveCollaboratorAPI`, newCollaborator);
  } catch (error) {
    expect(error.response.status).toBe(401);
    expect(error.response.data.error).toBe("Authentication required");
  }
   
});

//API autentication 
it("TC-AUTH.1 - should authenticate user with valid credentials", async () => {
  const loginData = {
    email: "marioRisi@gmail.com",
    psw: "12349087",
  };

  const response = await axios.post(`${apiBaseURL}/api/auth`, loginData);
  expect(response.status).toBe(200);
  expect(response.data.id).toEqual("d5eca240b5a7bd21ee42");
});

it("TC-AUTH.2 - should return an error when password is missing", async () => {
  const loginData = {
    email: "marioRisi@gmail.com",
    psw: "",
  };

  try {
    await axios.post(`${apiBaseURL}/api/auth`, loginData);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data).toEqual({
      error: "Email e password sono richiesti",
    });
  }
});

it("TC-AUTH.3 - should return an error when password is incorrect", async () => {
  const loginData = {
    email: "marioRisi@gmail.com",
    psw: "49036430",
  };

  try {
    await axios.post(`${apiBaseURL}/api/auth`, loginData);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data).toEqual({
      error: "Email o password non validi",
    });
  }
});

it("TC-AUTH.4 - should return an error when email is missing", async () => {
  const loginData = {
    email: "",
    psw: "49036430",
  };

  try {
    await axios.post(`${apiBaseURL}/api/auth`, loginData);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data).toEqual({
      error: "Email e password sono richiesti",
    });
  }
});

it("TC-AUTH.5 - should return an error when email format is invalid", async () => {
  const loginData = {
    email: "pippok9",
    psw: "49036430",
  };

  try {
    await axios.post(`${apiBaseURL}/api/auth`, loginData);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data).toEqual({
      error: "Email o password non validi",
    });
  }
});
