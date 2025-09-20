const moviesUrl = "http://localhost:3000/films";
const ticketsUrl = "http://localhost:3000/tickets";

document.addEventListener("DOMContentLoaded", () => {
  fetchMovies();
});

//1 Fetch all movies
function fetchMovies() {
  fetch(moviesUrl)
    .then(res => res.json())
    .then(movies => displayTitles(movies));
}

//2 Display movie titles
function displayTitles(movies) {
  const container = document.getElementById("titles-container");
  container.innerHTML = "";

  movies.forEach((movie) => {
    // calculate remaining tickets
    const remaining = movie.capacity - movie.tickets_sold;
    const li = document.createElement("li");
    li.classList.add(
      "list-group-item",
      "d-flex",
      "justify-content-between",
      "align-items-center"
    );

    // Title span (clickable)
    const titleSpan = document.createElement("span");
    titleSpan.textContent = movie.title;
    titleSpan.classList.add("movie-title");
    titleSpan.style.cursor = "pointer";
    // If sold out, add special class
    if (remaining === 0) {
      titleSpan.classList.add("sold-out");
    }
    titleSpan.addEventListener("click", () => {
      displayPoster(movie);
      displayDetails(movie);
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.classList.add("btn", "btn-sm", "btn-danger");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent triggering the title click
      deleteMovie(movie.id);
    });

    li.appendChild(titleSpan);
    li.appendChild(deleteBtn);
    container.appendChild(li);
  });
}

// 3. Display movie poster
function displayPoster(movie) {
  const poster = document.getElementById("movie-poster");
  poster.src = movie.poster;
}

//4 delete function
function deleteMovie(movieId) {
  // 1. Delete related tickets first
  fetch(`${ticketsUrl}?film_id=${movieId}`)
    .then((res) => res.json())
    .then((tickets) => {
      const deletePromises = tickets.map((ticket) =>
        fetch(`${ticketsUrl}/${ticket.id}`, { method: "DELETE" })
      );
      return Promise.all(deletePromises);
    })
    .then(() => {
      // 2. Delete the movie itself
      return fetch(`${moviesUrl}/${movieId}`, { method: "DELETE" });
    })
    .then(() => {
      // 3. Refresh movies list
      fetchMovies();

      // 4. Clear poster and details if the deleted movie was showing
      const poster = document.getElementById("movie-poster");
      const details = document.getElementById("details-container");

      if (poster.src && details.innerHTML.includes(`id="${movieId}"`)) {
        poster.src = "";
        details.innerHTML = "<p>Select a movie to see details.</p>";
      }
    })
    .catch((err) => console.error("Delete failed:", err));
}

//5 displaying details
function displayDetails(movie) {
  const details = document.getElementById("details-container");
  const remaining = movie.capacity - movie.tickets_sold;

  details.innerHTML = `
    <div id="${movie.id}">
    <h3>${movie.title}</h3>
    <p><strong>Runtime:</strong> ${movie.runtime} mins</p>
    <p><strong>Showtime:</strong> ${movie.showtime}</p>
    <p><strong>Description:</strong> ${movie.description}</p>
    <p><strong>Remaining Tickets:</strong> <span id="remaining">${remaining}</span></p>
    <button id="buy-btn" class="btn ${
      remaining > 0 ? "btn-success" : "btn-danger"
    }"
      ${remaining === 0 ? "disabled" : ""}>
      ${remaining > 0 ? "Buy Ticket" : "Sold Out"}
    </button>
    </div>
  `;

  if (remaining > 0) {
    document
      .getElementById("buy-btn")
      .addEventListener("click", () => handleBuyTicket(movie));
  }
}

// 5. Handle buy ticket logic
function handleBuyTicket(movie) {
  const remaining = movie.capacity - movie.tickets_sold;
  if (remaining <= 0) return;

  //Update tickets db
  fetch(`${ticketsUrl}?film_id=${movie.id}`)
    .then(res => res.json())
    .then(tickets => {
      if (tickets.length > 0) {
        // ticket exists,,PATCH
        const ticket = tickets[0];
        fetch(`${ticketsUrl}/${ticket.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number_of_tickets: ticket.number_of_tickets + 1 })
        });
      } else {
        // ticket not exist,,POST
        fetch(ticketsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            film_id: movie.id,
            number_of_tickets: 1
          })
        });
      }
    });

  // Update movies db (increasing tickets_sold)
  fetch(`${moviesUrl}/${movie.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickets_sold: movie.tickets_sold + 1 })
  })
    .then(res => res.json())
    .then(updatedMovie => {
      // Refresh details with updated data
      displayPoster(updatedMovie);
      displayDetails(updatedMovie);
    })
}
