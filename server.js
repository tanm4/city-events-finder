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
// HEALTH CHECK
// =====================
app.get("/health", (req, res) => {
  res.send("OK");
});

// =====================
// MAIN ROUTE (FIXED)
// =====================
app.get("/events", async (req, res) => {
  const city = req.query.city;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!city) {
    return res.status(400).json({ error: "City required" });
  }

  try {
    const [tm, eb, gp] = await Promise.all([
      getTicketmasterEvents(city, page),
      getEventbriteEvents(city, page),
      getGooglePlacesEvents(city) // limited results
    ]);

    let events = [...tm, ...eb, ...gp];

    // =====================
    // REMOVE DUPLICATES
    // =====================
    const seen = new Set();
    events = events.filter(e => {
      const key = `${e.name}-${e.date}-${e.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // =====================
    // SORT BY DATE
    // =====================
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // =====================
    // LIMIT RESULTS PER PAGE
    // =====================
    const paginated = events.slice(0, limit);

    // =====================
    // SMART hasMore
    // =====================
    const hasMore =
      tm.length > 0 || eb.length > 0;

    res.json({
      events: paginated,
      hasMore,
      page
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});


// =====================
// TICKETMASTER (FIXED)
// =====================
async function getTicketmasterEvents(city, page = 1) {
  if (!TICKETMASTER_KEY) return [];

  try {
    const res = await axios.get(
      "https://app.ticketmaster.com/discovery/v2/events.json",
      {
        params: {
          apikey: TICKETMASTER_KEY,
          city,
          page: page - 1, // 🔥 IMPORTANT (0-based)
          size: 50
        }
      }
    );

    const events = res.data._embedded?.events || [];

    return events.map(e => ({
      image: e.images?.[0]?.url || null,
      name: e.name || "No name",
      date: e.dates?.start?.localDate || "N/A",
      location: e._embedded?.venues?.[0]?.name || "Unknown"
    }));

  } catch (err) {
    console.log("Ticketmaster error:", err.message);
    return [];
  }
}


// =====================
// EVENTBRITE (FIXED)
// =====================
async function getEventbriteEvents(city, page = 1) {
  if (!EVENTBRITE_KEY) return [];

  try {
    const res = await axios.get(
      "https://www.eventbriteapi.com/v3/events/search/",
      {
        headers: {
          Authorization: `Bearer ${EVENTBRITE_KEY}`
        },
        params: {
          q: city,
          "location.address": city,
          expand: "venue",
          page: page
        }
      }
    );

    const events = res.data?.events || [];

    return events.map(e => ({
      name: e.name?.text || "No name",
      date: e.start?.local?.split("T")[0] || "N/A",
      location: e.venue?.address?.localized_address_display || city
    }));

  } catch (err) {
    console.log("Eventbrite error:", err.message);
    return [];
  }
}


// =====================
// GOOGLE PLACES (LIMITED)
// =====================
async function getGooglePlacesEvents(city) {
  if (!GOOGLEPLACES_KEY) return [];

  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: {
          query: `events in ${city}`,
          key: GOOGLEPLACES_KEY
        }
      }
    );

    const results = res.data.results || [];

    return results.map(p => ({
      name: p.name || "No name",
      date: new Date().toISOString().split("T")[0],
      location: p.formatted_address || "Unknown"
    }));

  } catch (err) {
    console.log("Google Places error:", err.message);
    return [];
  }
}


// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});