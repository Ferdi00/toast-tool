document.addEventListener("DOMContentLoaded", function () {
  const evaluationForm = document.querySelector("form");
  const notification = document.getElementById("notification");

  evaluationForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Previene la sottomissione del form

    const formData = new FormData(evaluationForm);

    try {
      const response = await fetch("/analyze", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const html = await response.text();
        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
      } else {
        // Tenta di leggere il messaggio JSON dall'errore
        const result = await response.json();
        showNotification(result.error || "Error during submission", "error");
      }
    } catch (error) {
      // Mostra l'errore di rete
      showNotification("Network error: " + error.message, "error");
    }
  });

  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = type === "success" ? "success" : "error";
    notification.style.display = "block";

    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }
});
