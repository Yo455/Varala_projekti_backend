const express = require("express"); //web-palvelinkirjasto (reitit, vastaukset jne.)
const cors = require("cors"); //antaa selaimesta tulevien frontend-pyyntöjen (eri portista) toimia.
const ical = require("node-ical"); //lukee ja muuntaa .ics-kalenteritapahtumia JSONiksi

const app = express();
// Dev-vaiheessa helpoin: salli kaikki originit
app.use(cors());
app.use(express.json());

//Muutetaan Fronttiin!!
const COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

// Jos linkki on webcal muodossa, muutetaan se https muotoon
function normalizeIcsUrl(u = "") {
  return u.replace(/^webcal(s)?:\/\//i, "https://");
}

//Color pois!!
// Ottaa ICS-tiedostosta tapahtumat: id, title, start, end, location, source
function eventFromIcal(e, color, sourceLabel) {
  if (!e || e.type !== "VEVENT") return null;
  const start = e.start instanceof Date ? e.start.toISOString() : e.start;
  const end = e.end instanceof Date ? e.end.toISOString() : e.end;
  if (!start || !end) return null;
  return {
    id: e.uid || `${sourceLabel}-${start}`,
    title: e.summary || "(no title)",
    start,
    end,
    location: e.location || undefined,
    source: sourceLabel,
    eventColor: color,
  };
}

// Kutsutaan normalizeIcsUrl
async function fetchIcs(url, color, label) {
  const u = normalizeIcsUrl(url);
  // Hakee tiedoston urlitiedon netistä
  try { 

    new URL(u); // Tarkistaa että URL on kelvollinen 

  } catch { 

    throw new Error(`Invalid URL: ${u}`); 

  } 

  const cal = await ical.async.fromURL(u, { 

    headers: { "User-Agent": "ICS-Demo/1.0 (+http://localhost)" }, 

    timeout: 15000, 

  }); 
  //Etsii vain tapahtumatiedot
  const out = [];
  for (const k in cal) {
    const e = cal[k];
    const ev = eventFromIcal(e, color, label);
    if (ev) out.push(ev);
  }
  return out;
}

app.get("/events", async (req, res) => {
  try {
    const raw = Array.isArray(req.query.url)
      ? req.query.url
      : req.query.url ? [req.query.url] : [];
// Jos ei annettu URLia → palautetaan demodata (kaksi tapahtumaa) jotta frontend voi näyttää jotain heti
    if (raw.length === 0) {
      return res.json([
        { id: "demo-1", title: "Treeni", start: "2025-10-22T16:00:00Z", end: "2025-10-22T17:00:00Z", eventColor: COLORS[0], source: "Demo A" },
        { id: "demo-2", title: "Ottelu", start: "2025-10-23T15:30:00Z", end: "2025-10-23T17:00:00Z", eventColor: COLORS[1], source: "Demo B" },
      ]);
    }

// Värit vittuun
    console.log("Fetching ICS from:", raw);
    const lists = await Promise.all(
      raw.map((u, i) => fetchIcs(u, COLORS[i % COLORS.length], `Source ${i + 1}`))
    );
    return res.json(lists.flat());
  } catch (err) {
    console.error("ICS fetch/parse failed:", err?.message || err);
    return res
      .status(400)
      .json({ error: "ICS fetch/parse failed", detail: String(err?.message || err) });
  }
});

app.get("/ping", (_req, res) => res.send("pong"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API running at http://localhost:${PORT}`));
