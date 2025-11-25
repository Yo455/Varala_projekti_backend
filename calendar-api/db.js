const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");


const DB_URL =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || "myuser"}:${process.env.POSTGRES_PASSWORD || "mypassword"}@${process.env.PGHOST || "db"}:${process.env.PGPORT || "5432"}/${process.env.POSTGRES_DB || "mydb"}`;

const useSSL = process.env.DATABASE_URL ? { rejectUnauthorized: false } : false;
let pool = null;
let ready = false;

async function init() {
  const useSSL = !!process.env.DATABASE_URL;
  try {
    pool = new Pool({
    connectionString: DB_URL,
    ssl: useSSL
  });

    await pool.query("SELECT 1");
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
    console.log("✅ db.js: Postgres available, using DB-backed storage");
  } catch (err) {
    console.warn("⚠️ db.js: Postgres unavailable, falling back to file storage:", err.message);
    pool = null;
    ready = false;
  }
}

// initialize on require
init();

/*async function readFileUrls() {
  try {
    //const txt = await fs.readFile(URL_FILE, "utf8");
    return txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeFileUrls(list) {
  const unique = Array.from(new Set(list.map((s) => String(s || "").trim()).filter(Boolean)));
  await fs.writeFile(URL_FILE, unique.join("\n"), "utf8");
  return unique;
}
*/
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


async function add(urls, user) {
  if (!user) {
    console.warn("db.js add: Missing user");
    return await getAll();
  }

  const normalizeUrl = (u) =>
    String(u || "").trim().replace(/^webcal(s)?:\/\//i, "https://").replace(/\/+$/, "");

  const unique = Array.from(new Set((urls || []).map((s) => normalizeUrl(s)).filter(Boolean)));
  if (unique.length === 0) return await getAll(user);

  if (!ready || !pool) {
    console.warn("db.js add: Postgres not ready — no-op, returning current list");
    return await getAll(user);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertText =
      "INSERT INTO saved_urls(user_name, url) VALUES($1, $2) ON CONFLICT DO NOTHING";
    for (const u of unique) {
      await client.query(insertText, [user, u]);
    }
    await client.query("COMMIT");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) { }
    console.warn("db.js add failed:", err.message);
  } finally {
    client.release();
  }

  return await getAll(user);
}



async function removeById(id, user) {
  if (!id || !user) return await getAll(user);
  if (!ready || !pool) {
    console.warn("db.js removeById: Postgres not ready — no-op");
    return await getAll(user);
  }
  try {
    await pool.query("DELETE FROM saved_urls WHERE id = $1 AND user_name = $2", [id, user]);
    return await getAll(user);
  } catch (err) {
    console.warn("db.js removeById failed:", err.message);
    return await getAll(user);
  }
}

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
      return { id: r.id, name: r.name, username: r.username, createdAt: r.created_at };
    }
    return null;
  } catch (err) {
    console.warn("db.js getProfileById failed:", err.message);
    return null;
  }
}

async function removeUrlsByUser(user) {
  if (!user) return await getAll(user);
  if (!ready || !pool) {
    console.warn("db.js removeUrlsByUser: Postgres not ready — no-op");
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
