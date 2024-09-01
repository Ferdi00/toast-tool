document.addEventListener("DOMContentLoaded", function () {
  // Inizializzazione
  initializeEvents();

  function initializeEvents() {
    var searchForm = document.getElementById("searchForm");
    var searchFormList = document.getElementById("searchFormList");
    var searchInput = document.getElementById("searchInput");
    var movieContainer = document.querySelector(".movie-container");
    var filters = document.getElementById("filters");
    var filterForm = document.getElementById("filterForm");
    var filterToggle = document.querySelector(".filter-toggle");
    var originalMovies = [];

    if (movieContainer) {
      originalMovies = Array.from(
        movieContainer.querySelectorAll(".movie-card")
      );
    }

    if (searchFormList) {
      searchFormList.addEventListener("submit", function (event) {
        searchMoviesInList(event, searchInput, movieContainer, originalMovies);
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        searchMovies(event, searchInput, movieContainer);
      });
    }

    if (filterForm) {
      filterForm.addEventListener("submit", function (event) {
        applyFilters(event, filterForm, movieContainer);
      });
    }

    if (filterToggle) {
      filterToggle.addEventListener("click", toggleFilterPanel);
    }

    initializeMovieCards();
    initializeMovieYears();
    initializeScoreButton();
    initializeFavoriteButton();
    initializeSeenButton();
  }

  function searchMovies(event, searchInput, movieContainer) {
    event.preventDefault();
    var searchText = searchInput.value.trim();
    fetch(`/search?query=${searchText}`)
      .then(handleResponse)
      .then(function (movies) {
        renderMovies(movies, movieContainer);
      })
      .catch(handleError);
  }

  function searchMoviesInList(
    event,
    searchInput,
    movieContainer,
    originalMovies
  ) {
    event.preventDefault();
    var searchText = searchInput.value.trim().toLowerCase();

    if (searchText === "") {
      // Se la barra di ricerca è vuota, ripristina tutti i film originali
      movieContainer.innerHTML = "";
      originalMovies.forEach(function (movie) {
        movieContainer.appendChild(movie);
      });
    } else {
      var filteredMovies = originalMovies.filter(function (movie) {
        var title = movie
          .querySelector(".movie-info h2")
          .textContent.toLowerCase();
        return title.includes(searchText);
      });

      // Aggiorna movieContainer con i film filtrati
      movieContainer.innerHTML = ""; // Svuota il contenitore dei film
      if (filteredMovies.length === 0) {
        // Mostra il messaggio "Film non trovato" se nessun film corrisponde alla ricerca
        movieContainer.innerHTML = "<p>Film non trovato</p>";
      } else {
        filteredMovies.forEach(function (movie) {
          movieContainer.appendChild(movie); // Aggiungi i film filtrati al contenitore
        });
      }
    }
  }

  function applyFilters(event, filterForm, movieContainer) {
    event.preventDefault();
    var params = new URLSearchParams(new FormData(filterForm)).toString();
    fetch(`/api/filter?${params}`)
      .then(handleResponse)
      .then(function (movies) {
        renderMovies(movies, movieContainer);
      })
      .catch(handleError);
  }

  function toggleFilterPanel() {
    var filters = document.getElementById("filters");
    filters.style.display = filters.style.display === "none" ? "flex" : "none";
  }

  function renderMovies(movies, movieContainer) {
    var movieHTML = "";
    if (movies.length === 0) {
      movieHTML = "<p>Film non trovato</p>";
    } else {
      movies.forEach(function (movie) {
        movieHTML +=
          '<div class="movie-card" data-movie-id="' +
          movie._id +
          '" onclick="location.href=\'/movie/' +
          movie._id +
          "'\">";
        movieHTML +=
          '<img src="' +
          movie.poster +
          '" alt="Poster of ' +
          movie.title +
          '">';
        movieHTML += '<div class="movie-info">';
        movieHTML +=
          "<h2>" +
          movie.title +
          ' (<span class="movie-year">' +
          movie.year +
          "</span>)</h2>";
        movieHTML += "<p><strong>Genre:</strong> " + movie.genre + "</p>";
        movieHTML +=
          "<p><strong>Certificate:</strong> " + movie.certificate + "</p>";
        movieHTML +=
          "<p><strong>Duration:</strong> " + movie.duration + " min</p>";
        movieHTML +=
          '<p><strong>Rating:</strong> <span class="rating" data-rating="' +
          movie.rating +
          '">' +
          movie.rating +
          "</span></p>";
        movieHTML += "</div></div>";
      });
    }
    movieContainer.innerHTML = movieHTML;
    applyRatingColors();
  }

  function applyRatingColors() {
    var ratings = document.querySelectorAll(".rating");
    ratings.forEach(function (rating) {
      var value = parseFloat(rating.getAttribute("data-rating"));
      if (value < 6) {
        rating.style.color = "red";
      } else if (value >= 6 && value < 7.5) {
        rating.style.color = "yellow";
      } else if (value >= 7.5 && value < 9) {
        rating.style.color = "green";
      } else if (value >= 9) {
        rating.style.color = "purple";
      }
    });
  }

  function handleResponse(response) {
    if (!response.ok) {
      throw new Error("Errore nella richiesta al server: " + response.status);
    }
    return response.json();
  }

  function handleError(error) {
    console.error("Si è verificato un errore:", error);
    // Puoi gestire l'errore qui, ad esempio mostrando un messaggio all'utente
  }

 function initializeMovieCards() {
   var movieCards = document.querySelectorAll(".movie-card, .movie-card_w");
   movieCards.forEach(function (card) {
     card.addEventListener("click", function () {
       var movieId = card.getAttribute("data-movie-id");
       window.location.href = "/movie/" + movieId;
     });
   });
 }


  function initializeMovieYears() {
    var movieYears = document.querySelectorAll(".movie-year");
    movieYears.forEach(function (yearElem) {
      var year = yearElem.textContent;
      var yearInt = parseInt(year, 10);
      if (!isNaN(yearInt)) {
        yearElem.textContent = yearInt;
      }
    });
  }

  function initializeScoreButton() {
    var scoreButton = document.getElementById("score-button");
    if (scoreButton) {
      scoreButton.addEventListener("click", function () {
        const movieId = window.location.pathname.split("/").pop(); // Assuming the movie ID is in the URL
        const score = document.getElementById("user-score").value;

        if (!score) {
          alert("Please enter a score.");
          return;
        }

        fetch(`/user_score/${movieId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ score: score }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.error) {
              alert(data.error);
            } else {
              alert(data.message);
              window.location.reload();
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while adding the score.");
          });
      });
    }
  }

  function initializeFavoriteButton() {
    var favoriteButton = document.getElementById("favorite-button");
    if (favoriteButton) {
      favoriteButton.addEventListener("click", function () {
        const movieId = window.location.pathname.split("/").pop(); // Assuming the movie ID is in the URL

        fetch(`/add_to_favorites/${movieId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.error) {
              alert(data.error);
            } else {
              alert(data.message);
              window.location.reload();
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while adding the movie to favorites.");
          });
      });
    }
  }

  function initializeSeenButton() {
    var seenButton = document.getElementById("seen-button");
    if (seenButton) {
      seenButton.addEventListener("click", function () {
        const movieId = window.location.pathname.split("/").pop(); // Assuming the movie ID is in the URL
        const seenDate = document.getElementById("seen-date").value;

        if (!seenDate) {
          alert("Please select a date.");
          return;
        }

        fetch(`/add_to_watchlist/${movieId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ seenDate: seenDate }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.error) {
              alert(data.error);
            } else {
              alert(data.message);
              window.location.reload();
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while marking the movie as seen.");
          });
      });
    }
  }
});
