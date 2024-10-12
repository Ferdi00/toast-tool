function switchToRegister() {
  document.getElementById("login-container").classList.remove("active");
  document.getElementById("register-container").classList.add("active");
}

function switchToLogin() {
  document.getElementById("register-container").classList.remove("active");
  document.getElementById("login-container").classList.add("active");
}

document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const notification = document.getElementById("notification");

  // Gestisci l'invio del form di registrazione
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Previeni l'invio tradizionale del form

    const formData = new FormData(registerForm);

    const body = {
      username: formData.get("reg_uname"),
      email: formData.get("reg_email"),
      password: formData.get("reg_psw"),
      confirmPassword: formData.get("confirm_psw"),
    };

    // Verifica se le password coincidono
    if (body.password !== body.confirmPassword) {
      showNotification("Le password non coincidono", "error");
      return;
    }

    try {
      // Invia una richiesta POST al server per registrare l'utente
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification("Registrazione avvenuta con successo!", "success");
        registerForm.reset(); // Reset del form
      } else {
        showNotification(
          result.error || "Errore durante la registrazione",
          "error"
        );
      }
    } catch (error) {
      showNotification("Errore durante la richiesta", "error");
    }
  });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Previeni l'invio tradizionale del form

    const formData = new FormData(loginForm);
    const body = {
      email: formData.get("email"),
      psw: formData.get("psw"),
    };

    try {
      // Invia una richiesta POST al server per il login
      const response = await fetch("/standard_login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        // Se il login ha successo, reindirizza l'utente alla pagina profilo
        window.location.href = result.redirectUrl;
      } else {
        // Se c'è un errore, mostra la notifica
        showNotification(result.error || "Errore durante il login", "error");
      }
    } catch (error) {
      showNotification("Errore durante la richiesta", "error");
    }
  });

  // Funzione per mostrare la notifica
  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = type === "success" ? "success" : "error";
    notification.style.display = "block";

    // Nascondi la notifica dopo 3 secondi
    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }
});
