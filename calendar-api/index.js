/*// -----------------------------------------------
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
//  GET /events → hae kaikki tapahtumat tietokannasta
// -----------------------------------------------

// -----------------------------------------------
// POST /urls → lisää (tai päivitä) kalenteri-URLit tietokantaan
// -----------------------------------------------
app.post("/urls", async (req, res) => {
  try {
    console.log("[SERVER] POST /urls body:", req.body);

    const body = req.body || {};
    const user = String(body.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });

    let incoming = [];
    if (Array.isArray(body.urls)) incoming = body.urls;
    else if (typeof body.url === "string") incoming = [body.url];

    const validUrls = [];
    for (const u of incoming) {
      if (!u || typeof u !== "string") continue;
      const candidate = normalizeIcsUrl(u.trim());
      try { new URL(candidate); validUrls.push(candidate); } catch { }
    }

    console.log(`[SERVER] Saving ${validUrls.length} urls for user '${user}'`);
    const rows = await db.add(validUrls, user);
    return res.json(rows);
  } catch (err) {
    console.error("[SERVER] Failed saving urls:", err);
    return res.status(500).json({ error: "Failed saving urls" });
  }
});

// -----------------------------------------------
//  DELETE /urls → poista yksi kalenteri id:n TAI url:n perusteella
// -----------------------------------------------
app.delete("/urls", async (req, res) => {
  try {
    const user = String(req.body?.user || req.query?.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });

    const idRaw = req.body?.id ?? req.query?.id;
    const urlRaw = req.body?.url ?? req.query?.url;

    let rows;
    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      rows = await db.removeById(id, user);
    } else if (urlRaw) {
      rows = await db.removeByUrl(String(urlRaw), user);
    } else {
      return res.status(400).json({ error: "No id or url provided" });
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
    const user = String(req.query.user || "").trim();

    // Jos käyttäjää ei ole annettu → virhe
    if (!user) {
      return res.status(400).json({ error: "Missing user" });
    }

    // Hae tietokannasta käyttäjän URLit
    const rows = await db.getAll(user);

    // 🔹 Jos käyttäjä on "demo" tai ei ole tallennettuja URL:eja → palauta demodata
    if (user.toLowerCase() === "demo" || rows.length === 0) {
      console.log(`[SERVER] Returning demo URLs for user '${user}'`);

      return res.json([
        { id: 1, user, url: "https://demo-a.example.com/calendar.ics", seq: 1 },
        { id: 2, user, url: "https://demo-b.example.com/calendar.ics", seq: 2 },
      ]);
    }

    // 🔸 Jos löytyi oikeita URL:eja tietokannasta → palauta ne
    return res.json(rows);
  } catch (err) {
    console.error("Failed reading saved urls:", err);
    return res.status(500).json({ error: "Failed reading saved urls" });
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
*/

// -----------------------------------------------
// Calendar API - Backend (Node.js + Express)
// -----------------------------------------------
// Tämä API tarjoaa kolme pääominaisuutta:
//  1. Tallentaa ja hakee ICS-kalenterien URL-osoitteita PostgreSQL-tietokannasta.
//  2. Hakee ja jäsentää ICS (iCalendar) -tiedostoja node-ical-kirjastolla.
//  3. Palauttaa tapahtumat JSON-muodossa FullCalendar-käyttöliittymälle.
// -----------------------------------------------

// Calendar API - Backend (Node.js + Express)

const express = require("express");
const cors = require("cors");
const ical = require("node-ical");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

function normalizeIcsUrl(u = "") {
  return u.replace(/^webcal(s)?:\/\//i, "https://");
}

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

async function fetchIcs(url, color, label) {
  const u = normalizeIcsUrl(url);
  try {
    new URL(u);
  } catch {
    throw new Error(`Invalid URL: ${u}`);
  }
  const cal = await ical.async.fromURL(u, {
    headers: { "User-Agent": "ICS-Demo/1.0 (+http://localhost)" },
    timeout: 15000,
  });
  const out = [];
  for (const k in cal) {
    const ev = eventFromIcal(cal[k], color, label);
    if (ev) out.push(ev);
  }
  return out;
}

// POST /urls -> tallenna URLit (frontend kutsuu tätä)
app.post("/urls", async (req, res) => {
  try {
    console.log("[SERVER] POST /urls body:", req.body);
    const body = req.body || {};
    const user = String(body.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });

    let incoming = [];
    if (Array.isArray(body.urls)) incoming = body.urls;
    else if (typeof body.url === "string") incoming = [body.url];

    const validUrls = [];
    for (const u of incoming) {
      if (!u || typeof u !== "string") continue;
      const candidate = normalizeIcsUrl(u.trim());
      try { new URL(candidate); validUrls.push(candidate); } catch { }
    }

    console.log(`[SERVER] Saving ${validUrls.length} urls for user '${user}'`);
    const rows = await db.add(validUrls, user);
    return res.json(rows);
  } catch (err) {
    console.error("[SERVER] Failed saving urls:", err);
    return res.status(500).json({ error: "Failed saving urls" });
  }
});

// DELETE /urls -> poista id tai url ja user
app.delete("/urls", async (req, res) => {
  try {
    const user = String(req.body?.user || req.query?.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });

    const idRaw = req.body?.id ?? req.query?.id;
    const urlRaw = req.body?.url ?? req.query?.url;

    let rows;
    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      rows = await db.removeById(id, user);
    } else if (urlRaw) {
      rows = await db.removeByUrl(String(urlRaw), user);
    } else {
      return res.status(400).json({ error: "No id or url provided" });
    }

    return res.json(rows);
  } catch (err) {
    console.error("Failed deleting url:", err);
    return res.status(500).json({ error: "Failed deleting url" });
  }
});

// GET /urls -> palauta käyttäjän tallennetut URLit
app.get("/urls", async (req, res) => {
  try {
    const user = String(req.query.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });
    const rows = await db.getAll(user);
    return res.json(rows);
  } catch (err) {
    console.error("Failed reading saved urls:", err);
    return res.status(500).json({ error: "Failed reading saved urls" });
  }
});

// -----------------------------------------------
// Profiles endpoints
// -----------------------------------------------
// GET /profiles -> list all profiles
app.get("/profiles", async (_req, res) => {
  try {
    console.log('[SERVER] GET /profiles called');
    const rows = await db.getProfiles();
    return res.json(rows);
  } catch (err) {
    console.error("GET /profiles failed:", err);
    return res.status(500).json({ error: "Failed reading profiles" });
  }
});

// POST /profiles -> add a new profile
app.post("/profiles", async (req, res) => {
  try {
    const body = req.body || {};
    console.log('[SERVER] POST /profiles body:', body);
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    if (!name || !username) return res.status(400).json({ error: "Missing name or username" });

    const rows = await db.addProfile(name, username);
    // If addProfile returned single created profile, return it; otherwise return full list
    return res.json(rows);
  } catch (err) {
    console.error("POST /profiles failed:", err);
    return res.status(500).json({ error: "Failed creating profile" });
  }
});

// DELETE /profiles/:id -> delete profile by id
app.delete("/profiles/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[SERVER] DELETE /profiles/:id called for id=', id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    // Try to find the profile first so we know the username to clean up saved_urls
    const profile = await db.getProfileById(id);
    if (profile && profile.username) {
      console.log('[SERVER] Deleting saved_urls for username =', profile.username);
      await db.removeUrlsByUser(profile.username);
    }

    const rows = await db.removeProfileById(id);
    return res.json(rows);
  } catch (err) {
    console.error("DELETE /profiles/:id failed:", err);
    return res.status(500).json({ error: "Failed deleting profile" });
  }
});

// GET /events -> kolme tilannetta:
//  - ei parametreja: demo-data
//  - ?url=...      : hae ja palauta yhden ICS:n tapahtumat
//  - ?user=...     : hae käyttäjän tallennetut URLit ja yhdistä niiden tapahtumat
app.get("/events", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    const user = String(req.query.user || "").trim();

    if (!url && !user) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10).toISOString();
      return res.json([{ id: "demo-1", title: "Demo-tapahtuma", start, end, source: "demo", eventColor: COLORS[0] }]);
    }

    if (url) {
      try {
        const events = await fetchIcs(url, COLORS[0], url);
        return res.json(events);
      } catch (err) {
        console.error("Failed fetching ICS for url:", url, err);
        return res.status(500).json({ error: "Failed to fetch/parse ICS", detail: String(err?.message || err) });
      }
    }

    // user haetaan DB:stä ja yhdistetään tapahtumat
    const rows = await db.getAll(user);
    if (!rows || rows.length === 0) return res.json([]);
    const all = [];
    await Promise.all(rows.map(async (r, i) => {
      try {
        const color = COLORS[i % COLORS.length];
        const ev = await fetchIcs(r.url, color, r.url);
        all.push(...(ev || []));
      } catch (err) {
        console.error("Failed fetching ICS for", r.url, err?.message || err);
      }
    }));
    return res.json(all);
  } catch (err) {
    console.error("GET /events failed:", err);
    return res.status(500).json({ error: "Failed fetching events", detail: String(err?.message || err) });
  }
});

app.get("/ping", (_req, res) => res.send("pong"));

app.get("/health", async (_req, res) => {
  try {
    const dbReady = typeof db.ready === "function" ? db.ready() : false;
    return res.json({ ok: true, db: dbReady });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/", (req, res) => {
  res.send("API is running");
});
const path = require("path");

// Serve built UI from calendar-api/public
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API running on", PORT));
