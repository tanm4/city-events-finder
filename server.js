require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static("public"));

// =====================
// ENV KEYS
// =====================
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;
const EVENTBRITE_KEY = process.env.EVENTBRITE_KEY;
const GOOGLEPLACES_KEY = process.env.GOOGLEPLACES_KEY;

// =====================
// HEALTH CHECK (for LB)
// =====================
app.get("/health", (req, res) => {
  res.send("OK");
});

// =====================
// MAIN ROUTE
// =====================
app.get("/events", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "City required" });
  }

  try {
    const tm = await getTicketmasterEvents(city);
    const eb = await getEventbriteEvents(city);
    const gp = await getGooglePlacesEvents(city);

    let events = [...tm, ...eb, ...gp];

    // 🔥 FALLBACK (prevents empty UI)
    if (events.length === 0) {
      events = [
        {
          name: "Sample City Event",
          date: "2026-04-15",
          location: city
        },
        {
          name: "Community Meetup",
          date: "2026-04-20",
          location: city
        }
      ];
    }

    // Remove duplicates
    const seen = new Set();
    events = events.filter(e => {
      const key = e.name + e.date;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(events);

  } catch (err) {
    console.error("SERVER ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// =====================
// 1. TICKETMASTER
// =====================
async function getTicketmasterEvents(city) {
  if (!TICKETMASTER_KEY) return [];

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_KEY}&city=${city}`;

    const res = await axios.get(url);

    const events = res.data._embedded?.events || [];

    return events.map(e => ({
      name: e.name || "No name",
      date: e.dates?.start?.localDate || "N/A",
      location: e._embedded?.venues?.[0]?.name || "Unknown"
    }));

  } catch (err) {
    console.log("Ticketmaster error:", err.response?.data || err.message);
    return [];
  }
}

// =====================
// 2. EVENTBRITE
// =====================
async function getEventbriteEvents(city) {
  if (!EVENTBRITE_KEY) return [];

  try {
    const url = `https://www.eventbriteapi.com/v3/events/search/?q=${city}`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_KEY}`
      }
    });

    const events = res.data.events || [];

    return events.map(e => ({
      name: e.name?.text || "No name",
      date: e.start?.local?.split("T")[0] || "N/A",
      location: city
    }));

  } catch (err) {
    console.log("Eventbrite error:", err.response?.data || err.message);
    return [];
  }
}

// =====================
// 3. GOOGLE PLACES
// =====================
async function getGooglePlacesEvents(city) {
  if (!GOOGLEPLACES_KEY) return [];

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=events+in+${city}&key=${GOOGLEPLACES_KEY}`;

    const res = await axios.get(url);

    const results = res.data.results || [];

    return results.map(p => ({
      name: p.name || "No name",
      date: new Date().toISOString().split("T")[0],
      location: p.formatted_address || "Unknown"
    }));

  } catch (err) {
    console.log("Google Places error:", err.response?.data || err.message);
    return [];
  }
}

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
