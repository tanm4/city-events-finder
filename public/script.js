let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentCity = "";
let scrollCooldown = false;

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

// =====================
// SEARCH EVENTS (FIXED)
// =====================
async function searchEvents(reset = true) {
  const city = document.getElementById("cityInput").value.trim();
  const resultsDiv = document.getElementById("results");

  if (!city) {
    resultsDiv.innerHTML = "<p>Please enter a city</p>";
    return;
  }

  if (isLoading) return;

  if (reset) {
    currentPage = 1;
    resultsDiv.innerHTML = "";
    hasMore = true;
  }

  currentCity = city;
  isLoading = true;

  const loader = document.createElement("p");
  loader.innerText = "Loading...";
  loader.id = "loader";
  resultsDiv.appendChild(loader);

  try {
    const res = await fetch(
      `/events?city=${encodeURIComponent(city)}&page=${currentPage}&limit=10`
    );

    const data = await res.json();

    document.getElementById("loader")?.remove();

    if (data.error) {
      resultsDiv.innerHTML = `<p>⚠️ ${data.error}</p>`;
      isLoading = false;
      return;
    }

    const events = data.events || [];

    if (!Array.isArray(events) || events.length === 0) {
      hasMore = false;
      isLoading = false;
      return;
    }

    hasMore = data.hasMore;

    events.forEach(event => {
      const img =
        event.image?.trim()
          ? event.image
          : "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4";

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <img src="${img}" />
        <div class="card-body">
          <h3>${event.name}</h3>
          <p>📅 ${event.date}</p>
          <p>📍 ${event.location}</p>
        </div>
      `;

      resultsDiv.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    console.log("Loading page:", currentPage);
    resultsDiv.innerHTML += "<p>⚠️ Error loading events</p>";
  }

  isLoading = false;
}

// =====================
// LOAD MORE (FIXED)
// =====================
function loadMore() {
  if (!hasMore || isLoading) return;

  currentPage++;
  searchEvents(false);
}

// =====================
// GEOLOCATION (OPTIONAL)
// =====================
async function useMyLocation() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "📍 Detecting your location...";

  if (!navigator.geolocation) {
    resultsDiv.innerHTML = "Geolocation not supported";
    return;
  }

  try {
    const position = await getPosition();

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );

    const data = await res.json();

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.state;

    if (!city) {
      resultsDiv.innerHTML = "Could not detect city";
      return;
    }

    document.getElementById("cityInput").value = city;

    await searchEvents(true);

  } catch (err) {
    console.log(err);
    resultsDiv.innerHTML = "Location failed — using default city";

    document.getElementById("cityInput").value = "New York";
    searchEvents(true);
  }
}

// =====================
// AUTO START
// =====================
window.onload = () => {
  document.getElementById("cityInput").value = "Richmond";
  searchEvents(true);
};

window.addEventListener("scroll", () => {
  if (isLoading || !hasMore) return;

  const scrollTop = window.scrollY;
  const windowHeight = window.innerHeight;
  const fullHeight = document.documentElement.scrollHeight;

  if (scrollTop + windowHeight >= fullHeight - 150) {
    loadMore();
  }
});