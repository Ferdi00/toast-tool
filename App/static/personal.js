document.addEventListener("DOMContentLoaded", function () {
  const message = "{{message}}";
  const messageDiv = document.getElementById("message");
  const notification = document.getElementById("notification");

  if (messageDiv.textContent == "{{message}}") {
    messageDiv.style.display = "none";
  } else {
    messageDiv.style.display = "block";
  }

  // Fetch dei collaboratori e visualizzazione delle card
  fetch("/getCollaborators")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Errore nel recupero dei collaboratori");
      }
      return response.json();
    })
    .then((data) => {
      const container = document.getElementById("collaborators-list");

      if (data.collaborators && data.collaborators.length > 0) {
        data.collaborators.forEach((collaborator) => {
          const collaboratorDiv = document.createElement("div");
          collaboratorDiv.classList.add("collaborator-card");

          collaboratorDiv.innerHTML = `
                        <p><strong>Name:</strong> ${collaborator.name}</p>
                        <p><strong>Surname:</strong> ${collaborator.surname}</p>
                        <p><strong>Collaborator ID:</strong> ${collaborator.collaboratorId}</p>
                        <form id="rateForm" method="POST" action="/rateCollaborator">
                            <input type="hidden" name="collaboratorid" value="${collaborator.collaboratorId}" id="collaboratorid">
                            <button type="submit">Rate</button>
                        </form>
                    `;

          container.appendChild(collaboratorDiv);
        });
      } else {
        container.innerHTML = "<p>No collaborators found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      showNotification("Errore durante il caricamento dei collaboratori", "error");
    });
});

document.getElementById("logout-btn").addEventListener("click", function () {
  fetch("/logout", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).catch((error) => {
    showNotification("Errore durante il logout", "error");
  });
});


