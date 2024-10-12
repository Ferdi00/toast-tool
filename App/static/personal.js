
        document.addEventListener('DOMContentLoaded', function () {
            // Controllo se c'è un messaggio da visualizzare
           const message = "{{message}}"; // Rimuovi trim() e qualsiasi altra manipolazione
           const messageDiv = document.getElementById('message'); 
           if (messageDiv.textContent == "{{message}}") {
            messageDiv.style.display = 'none'; // nascondi il div
           }
           else {
            messageDiv.style.display = 'block'; // mostra il div
           }

            // Fetch dei collaboratori e visualizzazione delle card
            fetch('/getCollaborators')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('collaborators-list');

                    if (data.collaborators && data.collaborators.length > 0) {
                        data.collaborators.forEach(collaborator => {
                            const collaboratorDiv = document.createElement('div');
                            collaboratorDiv.classList.add('collaborator-card');

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
                        container.innerHTML = '<p>No collaborators found.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        });

        document
          .getElementById("logout-btn")
          .addEventListener("click", function () {
            fetch("/logout", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })
          });
