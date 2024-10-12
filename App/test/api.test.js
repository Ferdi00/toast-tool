const axios = require("axios");

// Base URL for the API
const apiBaseURL = "http://localhost:3000";

// Helper function to create a mock user
function createMockUser() {
  const uniqueId = Date.now(); // Generate unique timestamp to avoid conflicts

  return {
    userId: `user-${uniqueId}`,
    username: `user_${uniqueId}`,
    email: `user_${uniqueId}@prova.it`,
    password: "user1",
  };
}

describe("API Tests", () => {
  let mockUser;

  beforeAll(() => {
    // Create a unique user for the tests
    mockUser = createMockUser();
  });

  it("should register a new user", async () => {
    const newUser = {
      username: mockUser.username,
      email: mockUser.email,
      password: mockUser.password,
    };

    const response = await axios.post(`${apiBaseURL}/register`, newUser);
    expect(response.status).toBe(201);
    expect(response.data.message).toBe("Utente registrato con successo");
  });

 
  it("should authenticate user via /api/auth", async () => {
    const loginData = {
      email: mockUser.email,
      psw: mockUser.password,
    };

    const response = await axios.post(`${apiBaseURL}/api/auth`, loginData);
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined(); // Check if token is returned
  });

  it("should fail to authenticate user with missing credentials via /api/auth", async () => {
    const loginData = {
      email: "",
      psw: "",
    };

    try {
      await axios.post(`${apiBaseURL}/api/auth`, loginData);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe("Email e password sono richiesti");
    }
  });

  it("should fail to authenticate user with invalid credentials via /api/auth", async () => {
    const invalidLoginData = {
      email: "invalidemail@domain.com",
      psw: "wrongpassword",
    };

    try {
      await axios.post(`${apiBaseURL}/api/auth`, invalidLoginData);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe("Email o password non validi");
    }
  });

  it("should add a new collaborator", async () => {
    // Step 1: Authenticate the user via /api/auth to get the token
    const loginData = {
      email: mockUser.email,
      psw: mockUser.password,
    };

    const authResponse = await axios.post(`${apiBaseURL}/api/auth`, loginData);
    expect(authResponse.status).toBe(200);
    const token = authResponse.data.token; // Extract the token from the response
    const id = authResponse.data.id; // Extract the id from the response
    expect(token).toBeDefined(); // Ensure the token is defined
    expect(id).toBeDefined(); // Ensure the id is defined

    // Step 2: Use the token to add a new collaborator
    const newCollaborator = {
      token, // Pass the token here
      userId: id,
      collaboratorId: "8",
      name: "New",
      surname: "Collaborator",
    };

    const response = await axios.post(
      `${apiBaseURL}/saveCollaboratorAPI`,
      newCollaborator
    );
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.collaborator.id).toBe(newCollaborator.collaboratorId);
  });

  it("should add a new collaborator with the same id", async () => {
    // Step 1: Authenticate the user via /api/auth to get the token
    const loginData = {
      email: mockUser.email,
      psw: mockUser.password,
    };

    const authResponse = await axios.post(`${apiBaseURL}/api/auth`, loginData);
    expect(authResponse.status).toBe(200);
    const token = authResponse.data.token; // Extract the token from the response
    const id = authResponse.data.id; // Extract the id from the response
    expect(token).toBeDefined(); // Ensure the token is defined
    expect(id).toBeDefined(); // Ensure the id is defined

    // Step 2: Use the token to add a new collaborator
    const newCollaborator = {
      token, // Pass the token here
      userId: id,
      collaboratorId: "8",
      name: "New",
      surname: "Collaborator",
    };

    const response = await axios.post(
      `${apiBaseURL}/saveCollaboratorAPI`,
      newCollaborator
    );
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.collaborator.id).toBe(newCollaborator.collaboratorId);
  });

});
