const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");


// -------------------------
// Tietokanta-funktiot
// 1. getAll(user) - Hae kaikki tallennetut URLit käyttäjälle
// 2. add(urls, user) - Lisää uusia URL-osoitteita käyttäjälle
// 3. removeById(id, user) - Poista tallennettu URL id:llä käyttäjältä
// 4. removeByUrl(url, user) - Poista tallennettu URL URL:llä käyttäjältä
// 5. Profiilit:
//    - getProfiles() - Hae kaikki profiilit
//    - addProfile(name, username) - Lisää uusi profiili
//    - removeProfileById(id) - Poista profiili id:llä
//    - getProfileById(id) - Hae profiili id:llä
//    - removeUrlsByUser(user) - Poista kaikki tallennetut URLit käyttäjältä
// -------------------------

// Postgres-yhteyden määrittely ympäristömuuttujien perusteella
const DB_URL =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.PGHOST || "db"}:${process.env.PGPORT || "5432"}/${process.env.POSTGRES_DB}`;
let pool = null;
let ready = false;

//odottaa, että Postgres on valmis, yrittää yhdistää useita kertoja
async function waitForDB(retries = 10, delay = 2000) {
  const useSSL = !!process.env.DATABASE_URL; //käytetään SSL:ää, jos DATABASE_URL on asetettu, yleensä pilvipalveluissa vaaditaan SSL-yhteys
  for (let i = 0; i < retries; i++) {
    try {
      const testPool = new Pool({ connectionString: DB_URL, ssl: useSSL }); //luodaan uusi pool-yhteys tietokantaan
      await testPool.query("SELECT 1"); //testataan yhteys suorittamalla yksinkertainen kysely
      await testPool.end(); //suljetaan testiyhteys
      console.log("✅ Postgres is ready"); //jos onnistuu, tietokanta on valmis ja tulostetaan viesti konsoliin
      return true;
    } catch (err) {
      console.log(`⚠️ Postgres not ready yet (${i + 1}/${retries}) - retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("❌ Postgres did not become ready in time"); //jos ei onnistu, heitetään virhe
}
async function init() { //alustaa tietokantayhteyden ja luo tarvittavat taulut, jos niitä ei ole olemassa
  try {
    const useSSL = !!process.env.DATABASE_URL;
    if (!process.env.DATABASE_URL) {
      await waitForDB();
    }
    
    pool = new Pool({ connectionString: DB_URL, ssl: useSSL });

    await pool.query("SELECT 1");


    //pitäisi olla init.sql:ssä, mutta taulut luodaan nyt tässä
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_urls (
        id SERIAL PRIMARY KEY,
        user_name TEXT NOT NULL,
        url TEXT NOT NULL,
        UNIQUE (user_name, url)
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    ready = true;
    console.log("✅ db.js: Postgres available, using DB-backed storage"); //jos kaikki ok, db valmis käyttöön
  } catch (err) {
    console.warn("⚠️ db.js: Postgres unavailable, falling back to file storage:", err.message); //jos ei onnistu, db ei valmis, käytetään fallbacktia eikä toimi ohjelma oikein
    pool = null;
    ready = false;
  }
}

init(); //käynnistetään init-funktio heti moduulin latautuessa, tekee siis tietokantayhteyden

//kerää kaikki tallennetut URL-osoitteet tietylle käyttäjälle tai kaikille käyttäjille
async function getAll(user) {
  if (!ready || !pool) {
    console.warn("db.js getAll: Postgres not ready — returning empty list");
    return [];
  }
  try {
    const params = [];
    let query = `SELECT id, user_name AS user, url, ROW_NUMBER() OVER (ORDER BY id) AS seq FROM saved_urls`;
    if (user) {
      query += ` WHERE user_name = $1 ORDER BY id`;
      params.push(user);
    } else {
      query += ` ORDER BY id`;
    }

    //suorita kysely tietokantaan
    const res = await pool.query(query, params);
    return res.rows.map((r) => ({
      id: r.id,
      user: r.user,
      url: r.url,
      seq: Number(r.seq),
    }));
  } catch (err) {
    console.warn("db.js getAll failed:", err.message);
    return [];
  }
}

//lisää uusia URL-osoitteita tietylle käyttäjälle, välttää duplikaatit tekemällä duplikaattitarkistuksen
async function add(urls, user) {
  if (!user) {
    console.warn("db.js add: Missing user");
    return await getAll();
  }

  //urlien normalisointi: trimmaa whitespace, korvaa webcal/webcals https:llä, poista loput vinoviivat, helpompi käsitellä, joten siksi tehdään näin
  const normalizeUrl = (u) =>
    String(u || "").trim().replace(/^webcal(s)?:\/\//i, "https://").replace(/\/+$/, "");

  const unique = Array.from(new Set((urls || []).map((s) => normalizeUrl(s)).filter(Boolean)));
  if (unique.length === 0) return await getAll(user);

  if (!ready || !pool) {
    console.warn("db.js add: Postgres not ready — no-op, returning current list");
    return await getAll(user);
  }


//client on yhteys poolista, , lisätään URLit käyttäjälle, jos duplikaatteja löytyy, ohitetaan ne, lopuksi commit tai rollback virheen sattuessa
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertText =
      "INSERT INTO saved_urls(user_name, url) VALUES($1, $2) ON CONFLICT DO NOTHING";
    for (const u of unique) {
      await client.query(insertText, [user, u]);
    }
    await client.query("COMMIT"); //jos kaikki onnistuu, tehdään commit eli siis tallennetaan muutokset tietokantaan
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) { } //jos jokin menee pieleen, rollbackataan eli perutaan kaikki muutokset
    console.warn("db.js add failed:", err.message); //lokitetaan virhe
  } finally {
    client.release(); //vapautetaan client takaisin pooliin eli suljetaan yhteys
  }

  return await getAll(user);
}


//poistaa tallennetun URL-osoitteen tietyn käyttäjän osalta id:n perusteella
async function removeById(id, user) {
  if (!id || !user) return await getAll(user);
  if (!ready || !pool) {
    console.warn("db.js removeById: Postgres not ready — no-op"); //jos tietokanta ei ole valmis, ei tehdä mitään
    return await getAll(user);
  }
  try {
    await pool.query("DELETE FROM saved_urls WHERE id = $1 AND user_name = $2", [id, user]); //poistetaan rivi id:n ja käyttäjän perusteella, $1 ja $2 ovat paikkamerkkejä
    return await getAll(user);
  } catch (err) {
    console.warn("db.js removeById failed:", err.message);
    return await getAll(user);
  }
}
//poistaa tallennetun URL-osoitteen tietyn käyttäjän osalta URL:n perusteella
async function removeByUrl(url, user) {
  if (!url || !user) return await getAll(user);
  if (!ready || !pool) {
    console.warn("db.js removeByUrl: Postgres not ready — no-op");
    return await getAll(user);
  }
  const canonical = String(url || "").trim().replace(/^webcal(s)?:\/\//i, "https://").replace(/\/+$/, "");
  try {
    await pool.query(
      "DELETE FROM saved_urls WHERE regexp_replace(url, '/+$', '') = $1 AND user_name = $2",
      [canonical, user]
    );
    return await getAll(user);
  } catch (err) {
    console.warn("db.js removeByUrl failed:", err.message);
    return await getAll(user);
  }
}

//exportataan funktiot, joita muut moduulit voivat käyttää
module.exports = {
  getAll,
  add,
  removeById,
  removeByUrl,
  // profiles
  getProfiles,
  addProfile,
  removeProfileById,
  getProfileById,
  removeUrlsByUser,
  // expose readiness for diagnostics
  ready: () => ready,
};

// -------------------------
// Profiles functions
// -------------------------
async function getProfiles() {
  if (!ready || !pool) {
    console.warn("db.js getProfiles: Postgres not ready — returning empty list");
    return [];
  }
  try {
    const res = await pool.query("SELECT id, name, username, created_at FROM profiles ORDER BY id");
    return res.rows.map((r) => ({ id: r.id, name: r.name, username: r.username, createdAt: r.created_at }));
  } catch (err) {
    console.warn("db.js getProfiles failed:", err.message);
    return [];
  }
}

async function addProfile(name, username) {
  if (!name || !username) return await getProfiles();
  if (!ready || !pool) {
    console.warn("db.js addProfile: Postgres not ready — no-op");
    return await getProfiles();
  }
  try {
    const text = "INSERT INTO profiles(name, username) VALUES($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, name, username, created_at";
    const res = await pool.query(text, [name, username]);
    if (res.rows && res.rows.length > 0) {
      const r = res.rows[0];
      return [{ id: r.id, name: r.name, username: r.username, createdAt: r.created_at }];
    }
    // If nothing inserted (conflict), return full list
    return await getProfiles();
  } catch (err) {
    console.warn("db.js addProfile failed:", err.message);
    return await getProfiles();
  }
}
//poistaa profiilin id:n perusteella
async function removeProfileById(id) {
  if (!id) return await getProfiles();
  if (!ready || !pool) {
    console.warn("db.js removeProfileById: Postgres not ready — no-op");
    return await getProfiles();
  }
  try {
    await pool.query("DELETE FROM profiles WHERE id = $1", [id]);
    return await getProfiles();
  } catch (err) {
    console.warn("db.js removeProfileById failed:", err.message);
    return await getProfiles();
  }
}
//Hae profiili id:n perusteella
async function getProfileById(id) {
  if (!id) return null;
  if (!ready || !pool) {
    console.warn("db.js getProfileById: Postgres not ready — returning null");
    return null;
  }
  try {
    const res = await pool.query("SELECT id, name, username, created_at FROM profiles WHERE id = $1 LIMIT 1", [id]);
    if (res.rows && res.rows.length > 0) {
      const r = res.rows[0];
      //palauttaa profiiliobjektin, jossa on id, nimi, käyttäjätunnus ja luontiaika, nämä ovat tietokannan sarakkeita
      return { id: r.id, name: r.name, username: r.username, createdAt: r.created_at };
    }
    return null;
  } catch (err) {
    console.warn("db.js getProfileById failed:", err.message);
    return null;
  }
}

//poistaa kaikki tallennetut URL-osoitteet tietyn käyttäjän osalta
async function removeUrlsByUser(user) {
  if (!user) return await getAll(user);
  if (!ready || !pool) {
    console.warn("db.js removeUrlsByUser: Postgres not ready — no-op"); //jos tietokanta ei ole valmis, ei tehdä mitään
    return await getAll(user);
  
  }
  try {
    await pool.query("DELETE FROM saved_urls WHERE user_name = $1", [user]);
    return await getAll(user);
  } catch (err) {
    console.warn("db.js removeUrlsByUser failed:", err.message);
    return await getAll(user);
  }
}
