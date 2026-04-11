async function searchEvents() {
    const city = document.getElementById("cityInput").value.trim(); // IMPORTANT FIX
    const resultsDiv = document.getElementById("results");
  
    if (!city) {
      resultsDiv.innerHTML = "<p>Please enter a city</p>";
      return;
    }
  
    resultsDiv.innerHTML = "Loading...";
  
    try {
      const res = await fetch(`/events?city=${encodeURIComponent(city)}`);
      const data = await res.json();
  
      resultsDiv.innerHTML = "";
  
      data.forEach(event => {
        const div = document.createElement("div");
        div.className = "event-card";
  
        div.innerHTML = `
          <h3>${event.name}</h3>
          <p>📅 ${event.date}</p>
          <p>📍 ${event.location}</p>
        `;
  
        resultsDiv.appendChild(div);
      });
  
    } catch (err) {
      resultsDiv.innerHTML = "Error loading events";
    }
  }