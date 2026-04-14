let currentPage = 1;
let isLoading = false;
let hasMore = true;

// =====================
// SEARCH EVENTS
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

  isLoading = true;

  // loader
  const loader = document.createElement("p");
  loader.innerText = "Loading...";
  loader.id = "loader";
  resultsDiv.appendChild(loader);

  try {
    const res = await fetch(
      `/events?city=${encodeURIComponent(city)}&page=${currentPage}&limit=${currentPage}50`
    );

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid JSON");
    }

    const loaderEl = document.getElementById("loader");
    if (loaderEl) loaderEl.remove();

    if (!res.ok || data.error) {
      resultsDiv.innerHTML += `<p>⚠️ ${data.error || "Server error"}</p>`;
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
        <img src="${img}" onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4'" />
        <div class="card-body">
          <h3>${event.name}</h3>
          <p>📅 ${event.date}</p>
          <p>📍 ${event.location}</p>
        </div>
      `;

      resultsDiv.appendChild(div);
    });

    // 🔥 AUTO LOAD MORE IF PAGE NOT SCROLLABLE
    setTimeout(() => {
      if (
        document.documentElement.scrollHeight <= window.innerHeight &&
        hasMore
      ) {
        loadMore();
      }
    }, 200);

  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML += "<p>⚠️ Error loading events</p>";
  }

  isLoading = false;
}

// =====================
// LOAD MORE
// =====================
function loadMore() {
  if (!hasMore || isLoading) return;

  currentPage++;
  console.log("Loading page:", currentPage);

  searchEvents(false);
}

// =====================
// INTERSECTION OBSERVER (BEST SCROLL)
// =====================
const sentinel = document.createElement("div");
sentinel.id = "sentinel";
document.body.appendChild(sentinel);

const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  },
  {
    root: null,
    rootMargin: "200px",
    threshold: 0
  }
);

observer.observe(sentinel);

// =====================
// GEOLOCATION
// =====================
async function useMyLocation() {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "📍 Detecting your location...";

  try {
    const position = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

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

    if (!city) throw new Error("No city found");

    document.getElementById("cityInput").value = city;

    await searchEvents(true);

  } catch (err) {
    console.log(err);
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