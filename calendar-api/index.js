

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
const path = require("path");

const app = express(); // Luo Express-sovellus
app.use(express.json()); // JSON-body parser
app.use(express.static(path.join(__dirname, "public"))); // Staattiset tiedostot  
app.use(cors()); // Ota CORS käyttöön

// -----------------------------------------------
// ICS fetching and parsing
// -----------------------------------------------

const COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"]; // Värit tapahtumille

function normalizeIcsUrl(u = "") { // Normalisoi ICS URL, url siis oikeaan muotoon
  return u.replace(/^webcal(s)?:\/\//i, "https://");
}

function eventFromIcal(e, color, sourceLabel) {
  // Muunna node-ical tapahtuma yleiseen muotoon
  if (!e || e.type !== "VEVENT") return null; //vevent tarkistus, eli siis onko kyseessä tapahtuma
  
  //
  const start = e.start instanceof Date ? e.start.toISOString() : e.start; // Muunna alkuaika ISO-muotoon
  const end = e.end instanceof Date ? e.end.toISOString() : e.end; // Muunna loppuaika ISO-muotoon
  if (!start || !end) return null;
  return {
    id: e.uid || `${sourceLabel}-${start}`, // Tapahtuman ID, käytä UID:ta tai luo oma. UID on uniikki tunniste tapahtumalle
    title: e.summary || "(no title)", // Tapahtuman otsikko
    start,
    end,
    location: e.location || undefined,
    source: sourceLabel,
    eventColor: color,
  };
}
// Hae ja jäsennä ICS URL
async function fetchIcs(url, color, label) { // Hae ja jäsennä ICS URL
  const u = normalizeIcsUrl(url); // Normalisoi URL eli webcal -> https tyyppimuutos
  try {
    new URL(u); // Tarkista, että URL on validi
  } catch {
    throw new Error(`Invalid URL: ${u}`); // Heitä virhe, jos URL ei ole validi
  }
  const cal = await ical.async.fromURL(u, {
    headers: { "User-Agent": "ICS-Demo/1.0 (+http://localhost)" },
    timeout: 15000,
  });
  const out = []; // Tuloslista tapahtumille, alustaan tyhjänä
  for (const k in cal) { // Käy läpi kaikki kalenterin avaimet
    const ev = eventFromIcal(cal[k], color, label); // Muunna tapahtuma yleiseen muotoon
    if (ev) out.push(ev); // Lisää tapahtuma tuloslistaan
  }
  return out; // Palauta tapahtumat
}

// POST /urls -> tallenna URLit (frontend kutsuu tätä kun käyttäjä lisää uuden URLin UIn kautta)
app.post("/urls", async (req, res) => {
  try {
    console.log("[SERVER] POST /urls body:", req.body); // Lokita saapuva body, debuggausta varten
    const body = req.body || {}; // Varmista, että body on määritetty, req.body voi olla undefined jos ei ole JSON
    const user = String(body.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" }); // Käyttäjä on pakollinen, muuter

    let incoming = []; // Saapuvat URLit, alustetaan tyhjäksi taulukoksi
    if (Array.isArray(body.urls)) incoming = body.urls; // Jos body.urls on taulukko, käytä sitä, muuten yksi URL
    else if (typeof body.url === "string") incoming = [body.url]; // Yksi URL merkkijonona, laitetaan taulukkoon

    const validUrls = []; // Validit URLit tallennettavaksi
    for (const u of incoming) { // Käy läpi saapuvat URLit for loopin avulla
      if (!u || typeof u !== "string") continue; // Ohita ei-merkkijonoarvot
      const candidate = normalizeIcsUrl(u.trim()); // Normalisoi URL
      try { new URL(candidate); validUrls.push(candidate); } catch { } // Vain validit URLit lisätään
    }

    console.log(`[SERVER] Saving ${validUrls.length} urls for user '${user}'`); // Lokita tallennettavat URLit
    const rows = await db.add(validUrls, user); // Tallenna URLit tietokantaan
    return res.json(rows); // Palauta tallennetut rivit JSON-muodossa
  } catch (err) { // Virheenkäsittely
    console.error("[SERVER] Failed saving urls:", err); // Lokita virhe
    return res.status(500).json({ error: "Failed saving urls" }); // Palauta 500 virhe, tarkoittaa palvelinvirhettä
  }
});

// DELETE /urls -> poista id tai url ja user, käyttäjä tekee poiston UI:n kautta
app.delete("/urls", async (req, res) => {
  try {
    const user = String(req.body?.user || req.query?.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });

    const idRaw = req.body?.id ?? req.query?.id; // Hae id body:stä tai query:stä
    const urlRaw = req.body?.url ?? req.query?.url; // Hae url body:stä tai query:stä

    let rows; // Tallennetut rivit, alustetaan määrittelemättömäksi
    if (idRaw) { // Jos id on annettu, poista id:llä
      const id = Number(idRaw); // Muunna id numeroksi
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" }); // Tarkista, että id on numero
      rows = await db.removeById(id, user);
    } else if (urlRaw) {
      rows = await db.removeByUrl(String(urlRaw), user); // Poista url:llä
    } else { 
      return res.status(400).json({ error: "No id or url provided" }); // Jos ei id:tä eikä url:ia, palauta 400 virhe
    }

    return res.json(rows); // Palauta poistettu rivi
  } catch (err) { // Virheenkäsittely
    console.error("Failed deleting url:", err); // Lokita virhe
    return res.status(500).json({ error: "Failed deleting url" }); // Palauta 500 virhe, tarkoittaa palvelinvirhettä
  }
});

// GET /urls -> palauta käyttäjän tallennetut URLit
app.get("/urls", async (req, res) => {
  try {
    const user = String(req.query.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing user" });
    const rows = await db.getAll(user); // Hae kaikki URLit tietokannasta käyttäjälle, asynkroninen kutsu, eli odota vastausta ennne kuin jatketaan seuraavaan riviin
    return res.json(rows);
  } catch (err) {
    console.error("Failed reading saved urls:", err);
    return res.status(500).json({ error: "Failed reading saved urls" });
  }
});

// -----------------------------------------------
// Profiles endpoints
// -----------------------------------------------
// GET /profiles -> listaa kaikki profiilit jotka on tallennettu tietokantaan
app.get("/profiles", async (_req, res) => {
  try {
    console.log('[SERVER] GET /profiles called'); // Lokita kutsu, debuggausta varten
    const rows = await db.getProfiles(); // Hae profiilit tietokannasta
    return res.json(rows); // Palauta profiilit JSON-muodossa
  } catch (err) { // Virheenkäsittely 
    console.error("GET /profiles failed:", err); // Lokita virhe
    return res.status(500).json({ error: "Failed reading profiles" }); // Palauta 500 virhe, tarkoittaa palvelinvirhettä
  }
});

// POST /profiles -> luo uusi profiili
app.post("/profiles", async (req, res) => {
  try {
    const body = req.body || {}; // Varmista, että body on määritetty, req.body voi olla undefined jos ei ole JSON
    console.log('[SERVER] POST /profiles body:', body);
    const name = String(body.name || "").trim(); // Nimi, käytetään trim poistamaan ylimääräiset välilyönnit, käsitellään aina merkkijonona
    const username = String(body.username || "").trim(); // Käyttäjätunnus, sama käsittely kuin nimelle
    if (!name || !username) return res.status(400).json({ error: "Missing name or username" }); // Pakolliset kentät

    const rows = await db.addProfile(name, username);
    // If addProfile returned single created profile, return it; otherwise return full list
    return res.json(rows);
  } catch (err) {
    console.error("POST /profiles failed:", err);
    return res.status(500).json({ error: "Failed creating profile" });
  }
});

// DELETE /profiles/:id -> poista profiili id:llä
app.delete("/profiles/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[SERVER] DELETE /profiles/:id called for id=', id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    // Poista myös profiiliin liittyvät saved_urls rivit
    const profile = await db.getProfileById(id);
    if (profile && profile.username) {
      console.log('[SERVER] Deleting saved_urls for username =', profile.username); // Lokita poistettava käyttäjätunnus
      await db.removeUrlsByUser(profile.username);
    }

    const rows = await db.removeProfileById(id); // Poista profiili id:llä
    return res.json(rows); // Palauta poistettu rivi
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
    // Jos ei url eikä user, palauta demotapahtuma
    if (!url && !user) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10).toISOString();
      return res.json([{ id: "demo-1", title: "Demo-tapahtuma", start, end, source: "demo", eventColor: COLORS[0] }]);
    }
    // Jos url on annettu, hae ja palauta yhden ICS:n tapahtumat
    if (url) {
      try {
        const events = await fetchIcs(url, COLORS[0], url); // Hae ja jäsennä ICS URL, index 0 väri, eli sininen tässä tapauksessa
        return res.json(events);
      } catch (err) {
        console.error("Failed fetching ICS for url:", url, err);
        return res.status(500).json({ error: "Failed to fetch/parse ICS", detail: String(err?.message || err) });
      }
    }

    // user haetaan DB:stä ja yhdistetään tapahtumat
    const rows = await db.getAll(user);
    if (!rows || rows.length === 0) return res.json([]); // Ei tallennettuja URL:ja, palauta tyhjä lista
    const all = []; // Kaikki tapahtumat, alustetaan tyhjäksi taulukoksi
    await Promise.all(rows.map(async (r, i) => { // Käytä Promise.all jotta kaikki URLit haetaan rinnakkain
      try {
        const color = COLORS[i % COLORS.length]; // Kierrä värejä käytössä olevien värien listasta
        const ev = await fetchIcs(r.url, color, r.url); // Hae ja jäsennä ICS URL
        all.push(...(ev || [])); // Lisää tapahtumat kokonaislistaan
      } catch (err) {
        console.error("Failed fetching ICS for", r.url, err?.message || err); // Lokita virhe, mutta jatka muiden URLien käsittelyä
      }
    }));
    return res.json(all);
  } catch (err) {
    console.error("GET /events failed:", err);
    return res.status(500).json({ error: "Failed fetching events", detail: String(err?.message || err) });
  }
});

app.get("/ping", (_req, res) => res.send("pong")); // Yksinkertainen ping-pong endpoint, tapauksessa että halutaan tarkistaa onko palvelin pystyssä ylipäätään

app.get("/health", async (_req, res) => {
  try {
    const dbReady = typeof db.ready === "function" ? db.ready() : false; // Tarkista tietokannan tila
    return res.json({ ok: true, db: dbReady }); // Palauta ok jos palvelin on pystyssä, ja db tila objektina
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});
// Perus reitti, palauttaa yksinkertaisen viestin
app.get("/", (req, res) => {
  res.send("API is running");
});



// Staattiset tiedostot (frontendin build-kansio)
app.use(express.static(path.join(__dirname, "public"))); // Staattiset tiedostot, path.join tarkoittaa polun yhdistämistä eli tässä tapauksessa calendar-api/public kansio, varmistaa että toimii eri käyttöjärjestelmissä

// app.get("*") käsittelee kaikki muut reitit, jotka eivät ole määritelty yllä
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


const PORT = process.env.PORT || 3001; // Portti, käytä ympäristömuuttujaa tai oletuksena 3001
app.listen(PORT, () => console.log("API running on", PORT)); // Käynnistä palvelin ja kuuntele määritetyllä portilla

// -----------------------------------------------
// End of Calendar API code
// -----------------------------------------------
