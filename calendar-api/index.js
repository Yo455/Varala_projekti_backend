// -----------------------------------------------
// Calendar API - Backend (Node.js + Express)
// -----------------------------------------------
// Tämä API tarjoaa kolme pääominaisuutta:
//  1. Tallentaa ja hakee ICS-kalenterien URL-osoitteita PostgreSQL-tietokannasta.
//  2. Hakee ja jäsentää ICS (iCalendar) -tiedostoja node-ical-kirjastolla.
//  3. Palauttaa tapahtumat JSON-muodossa FullCalendar-käyttöliittymälle.
// -----------------------------------------------

const express = require("express");
const cors = require("cors");
const ical = require("node-ical");
const db = require("./db"); // oma moduuli tietokantaoperaatioille (getAll, add, remove, jne.)

const app = express();
app.use(cors()); // sallitaan CORS (frontend <-> backend kommunikointi)
app.use(express.json()); // sallitaan JSON-runko pyynnöissä

// Väripaletti kalenteritapahtumille
const COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

// -----------------------------------------------
//  Apu: URLin normalisointi (muuttaa esim. webcal:// → https://)
// -----------------------------------------------
function normalizeIcsUrl(u = "") {
  return u.replace(/^webcal(s)?:\/\//i, "https://");
}

// -----------------------------------------------
//  Apu: Muuntaa yhden ICS-tapahtuman JSON-muotoon
// -----------------------------------------------
function eventFromIcal(e, color, sourceLabel) {
  if (!e || e.type !== "VEVENT") return null;

  const start = e.start instanceof Date ? e.start.toISOString() : e.start;
  const end = e.end instanceof Date ? e.end.toISOString() : e.end;
  if (!start || !end) return null;

  return {
    id: e.uid || `${sourceLabel}-${start}`, // uniikki tunniste
    title: e.summary || "(no title)",
    start,
    end,
    location: e.location || undefined,
    source: sourceLabel,
    eventColor: color,
  };
}

// -----------------------------------------------
//  Apu: Hakee ja jäsentää ICS-linkin tapahtumat node-icalilla
// -----------------------------------------------
async function fetchIcs(url, color, label) {
  const u = normalizeIcsUrl(url);
  try {
    new URL(u); // varmista että URL on kelvollinen
  } catch {
    throw new Error(`Invalid URL: ${u}`);
  }

  // Lataa ja jäsentää ICS kalenterin sisällön
  const cal = await ical.async.fromURL(u, {
    headers: { "User-Agent": "ICS-Demo/1.0 (+http://localhost)" },
    timeout: 15000,
  });

  // Muunna jokainen tapahtuma JSON-muotoon
  const out = [];
  for (const k in cal) {
    const e = cal[k];
    const ev = eventFromIcal(e, color, label);
    if (ev) out.push(ev);
  }
  return out;
}

// -----------------------------------------------
//  GET /urls → hae kaikki tallennetut ICS-linkit tietokannasta
// -----------------------------------------------
app.get("/urls", async (_req, res) => {
  try {
    const rows = await db.getAll();
    return res.json(rows); // esim. [{id:1, url:"..."}, ...]
  } catch (err) {
    console.error("Failed reading saved urls:", err);
    return res.status(500).json({ error: "Failed reading saved urls" });
  }
});

// -----------------------------------------------
// POST /urls → lisää (tai päivitä) kalenteri-URLit tietokantaan
// -----------------------------------------------
app.post("/urls", async (req, res) => {
  try {
    const body = req.body || {};
    let incoming = [];

    // hyväksy joko {urls:[...]} tai {url:"..."}
    if (Array.isArray(body.urls)) incoming = body.urls;
    else if (typeof body.url === "string") incoming = [body.url];

    // suodata virheelliset pois ja muunna webcal → https
    const valid = [];
    for (const u of incoming) {
      if (!u || typeof u !== "string") continue;
      const candidate = normalizeIcsUrl(u.trim());
      try {
        new URL(candidate);
        valid.push(candidate);
      } catch {
        // ohita virheellinen
      }
    }

    // lisää tietokantaan
    const rows = await db.add(valid);
    return res.json(rows);
  } catch (err) {
    console.error("Failed saving urls:", err);
    return res.status(500).json({ error: "Failed saving urls" });
  }
});

// -----------------------------------------------
//  DELETE /urls → poista yksi kalenteri id:n TAI url:n perusteella
// -----------------------------------------------
app.delete("/urls", async (req, res) => {
  try {
    const idRaw = req.body?.id ?? req.query?.id;
    const urlRaw = req.body?.url ?? req.query?.url;

    if (!idRaw && !urlRaw) {
      return res.status(400).json({ error: "No id or url provided" });
    }

    let rows;
    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }
      rows = await db.removeById(id);
    } else {
      rows = await db.removeByUrl(String(urlRaw));
    }

    return res.json(rows);
  } catch (err) {
    console.error("Failed deleting url:", err);
    return res.status(500).json({ error: "Failed deleting url" });
  }
});

// -----------------------------------------------
//  GET /events → hae tapahtumat annetuista ICS-linkeistä
// -----------------------------------------------
// Jos ei anneta yhtään url-parametria → palauttaa demodataa
// Muussa tapauksessa hakee jokaisen annetun linkin tapahtumat node-icalin avulla
// -----------------------------------------------
app.get("/events", async (req, res) => {
  try {
    const raw = Array.isArray(req.query.url)
      ? req.query.url
      : req.query.url
      ? [req.query.url]
      : [];

    // 🔸 Ei URLeja → palautetaan esimerkkitapahtumia (demodata)
    if (raw.length === 0) {
      return res.json([
        {
          id: "demo-1",
          title: "Treeni",
          start: "2025-10-22T16:00:00Z",
          end: "2025-10-22T17:00:00Z",
          eventColor: COLORS[0],
          source: "Demo A",
        },
        {
          id: "demo-2",
          title: "Ottelu",
          start: "2025-10-23T15:30:00Z",
          end: "2025-10-23T17:00:00Z",
          eventColor: COLORS[1],
          source: "Demo B",
        },
      ]);
    }

    // 🔹 Jos URLit on annettu, haetaan niiden ICS-tiedot
    console.log("Fetching ICS from:", raw);
    const lists = await Promise.all(
      raw.map((u, i) => fetchIcs(u, COLORS[i % COLORS.length], `Source ${i + 1}`))
    );

    // yhdistetään kaikki tapahtumat yhdeksi listaksi
    return res.json(lists.flat());
  } catch (err) {
    console.error("ICS fetch/parse failed:", err?.message || err);
    return res
      .status(400)
      .json({ error: "ICS fetch/parse failed", detail: String(err?.message || err) });
  }
});

// -----------------------------------------------
//  GET /ping → yksinkertainen testipiste (“pong” jos toimii)
// -----------------------------------------------
app.get("/ping", (_req, res) => res.send("pong"));

// -----------------------------------------------
//  GET /health → tarkistaa, onko tietokanta saatavilla
// -----------------------------------------------
app.get("/health", async (_req, res) => {
  try {
    const dbReady = typeof db.ready === "function" ? db.ready() : false;
    return res.json({ ok: true, db: dbReady });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// -----------------------------------------------
//  Käynnistä palvelin
// -----------------------------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API running at http://localhost:${PORT}`));
