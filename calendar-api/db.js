const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");


const DB_URL =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || "myuser"}:${process.env.POSTGRES_PASSWORD || "mypassword"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || "5438"}/${process.env.POSTGRES_DB || "mydb"}`;

let pool = null;
let ready = false;

async function init() {
  try {
    pool = new Pool({ connectionString: DB_URL });
    await pool.query("SELECT 1");
    await pool.query(`
  CREATE TABLE IF NOT EXISTS saved_urls (
    id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    url TEXT NOT NULL,
    UNIQUE (user_name, url)
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
  // expose readiness for diagnostics
  ready: () => ready,
};
