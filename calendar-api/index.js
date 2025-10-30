const express = require("express"); //web-palvelinkirjasto (reitit, vastaukset jne.)
const cors = require("cors"); //antaa selaimesta tulevien frontend-pyyntöjen (eri portista) toimia.
const ical = require("node-ical"); //lukee ja muuntaa .ics-kalenteritapahtumia JSONiksi
const fs = require("fs").promises;
const path = require("path");

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

// --- Simple file-based URL persistence (one URL per line)
const URL_FILE = path.join(__dirname, "saved_urls.txt");

async function readSavedUrls() {
  try {
    const txt = await fs.readFile(URL_FILE, "utf8");
    return txt
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    // If file not found, return empty list
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeSavedUrls(list) {
  const unique = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
  await fs.writeFile(URL_FILE, unique.join("\n"), "utf8");
  return unique;
}

// GET saved urls
app.get("/urls", async (_req, res) => {
  try {
    const urls = await readSavedUrls();
    return res.json(urls);
  } catch (err) {
    console.error("Failed reading saved urls:", err);
    return res.status(500).json({ error: "Failed reading saved urls" });
  }
});

// POST save urls. Accepts { url } or { urls: [...] }
app.post("/urls", async (req, res) => {
  try {
    const body = req.body || {};
    let incoming = [];
    if (Array.isArray(body.urls)) incoming = body.urls;
    else if (typeof body.url === "string") incoming = [body.url];

    // sanitize and validate URLs
    const valid = [];
    for (const u of incoming) {
      if (!u || typeof u !== "string") continue;
      const candidate = normalizeIcsUrl(u.trim());
      try {
        new URL(candidate);
        valid.push(candidate);
      } catch {
        // ignore invalid
      }
    }

    const existing = await readSavedUrls();
    const merged = Array.from(new Set([...existing, ...valid]));
    const written = await writeSavedUrls(merged);
    return res.json(written);
  } catch (err) {
    console.error("Failed saving urls:", err);
    return res.status(500).json({ error: "Failed saving urls" });
  }
});

// DELETE single url via body { url: '...' } or query ?url=...
app.delete("/urls", async (req, res) => {
  try {
    const toDelete = req.body?.url || req.query?.url;
    if (!toDelete) return res.status(400).json({ error: "No url provided" });
    const normalized = normalizeIcsUrl(String(toDelete).trim());
    const existing = await readSavedUrls();
    const filtered = existing.filter((u) => u !== normalized);
    const written = await writeSavedUrls(filtered);
    return res.json(written);
  } catch (err) {
    console.error("Failed deleting url:", err);
    return res.status(500).json({ error: "Failed deleting url" });
  }
});

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
