document.addEventListener("DOMContentLoaded", function () {
  const addCollaboratorForm = document.getElementById("addCollaboratorForm");
  const notification = document.getElementById("notification");
  let isAddingCollaborator = false;

  if (addCollaboratorForm) {
    addCollaboratorForm.addEventListener("submit", async function (e) {
      e.preventDefault(); // Preveniamo il comportamento di default del form

      if (isAddingCollaborator) return;

      isAddingCollaborator = true;

      // Raccogliamo i dati del form
      const formData = new FormData(addCollaboratorForm);
      const body = {
        collaboratorId: formData.get("collaboratorId"),
        name: formData.get("name"),
        surname: formData.get("surname"),
      };

      try {
        // Inviamo i dati del form usando fetch
        const response = await fetch("/addCollaborator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          // Gestiamo la risposta di successo
          const result = await response.json();
          showNotification("Collaboratore aggiunto con successo!", "success");
        } else {
          // Gestiamo la risposta di errore
          const errorResponse = await response.json();
          showNotification(
            errorResponse.error ||
              "Errore durante l'aggiunta del collaboratore",
            "error"
          );
        }
      } catch (error) {
        // Gestiamo gli errori di rete
        showNotification("Errore durae la richiesta", "error");
      } finally {
        isAddingCollaborator = false;
      }
    });
  }

  // Funzione per mostrare la notifica
  function showNotification(message, type) {
    if (!notification) return; // Verifica che l'elemento di notifica esista

    notification.textContent = message;
    notification.className = type === "success" ? "success" : "error";
    notification.style.display = "block";

    // Nascondiamo la notifica dopo 3 secondi
    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }
});
