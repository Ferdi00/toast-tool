document.addEventListener("DOMContentLoaded", function () {
  const evaluationForm = document.querySelector("form");
  const notification = document.getElementById("notification");

  evaluationForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Previene la sottomissione del form

    // Raccogli i dati dal form
    const formData = {
      ans1: document.querySelector('input[name="ans1"]:checked')?.value,
      ans2: document.querySelector('input[name="ans2"]:checked')?.value,
      ans3: document.querySelector('input[name="ans3"]:checked')?.value,
      ans4: document.querySelector('input[name="ans4"]:checked')?.value,
      ans5: document.querySelector('input[name="ans5"]:checked')?.value,
      ans6: document.querySelector('input[name="ans6"]:checked')?.value,
    };

    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
