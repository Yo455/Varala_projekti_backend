// ...existing code...
import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const API = "http://localhost:3001";
const DEFAULT_COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

function getUsername() {
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    return auth?.user?.username || "";
  } catch {
    return "";
  }
}

export default function Calendar() {
  const [sources, setSources] = useState([
    { url: "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [] },
    { url: "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [demoEvents, setDemoEvents] = useState([]);
  const calRef = useRef(null);

  function gotoIfPossible(iso) {
    if (!iso || !calRef.current) return;
    try { calRef.current.getApi().gotoDate(iso); } catch { }
  }

  // On mount: try to load saved urls for current user (if any), otherwise show local demo
  useEffect(() => {
    async function loadSavedOnMount() {
      try {
        const user = getUsername();
        if (!user) {
          await showDemo();
          return;
        }

        const res = await fetch(`${API}/urls?user=${encodeURIComponent(user)}`);
        if (!res.ok) {
          console.warn("GET /urls failed on mount:", res.status, await res.text());
          await showDemo();
          return;
        }

        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        const next = [...sources];
        next[0] = { ...(next[0] || {}), url: rows[0]?.url || "", id: rows[0]?.id || undefined };
        next[1] = { ...(next[1] || {}), url: rows[1]?.url || "", id: rows[1]?.id || undefined };
        setSources(next);

        if (!rows[0]?.url && !rows[1]?.url) await showDemo();
        else await load(next);
      } catch (e) {
        console.warn("Could not load saved urls on mount:", e);
        await showDemo();
      }
    }
    loadSavedOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUrls = useMemo(() => sources.some((s) => s.url && s.url.trim().length > 0), [sources]);

  // Local demo (no backend call) — avoids "Missing user" backend errors
  async function showDemo() {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10).toISOString();
      const events = [{ id: "demo-1", title: "Demo-tapahtuma", start, end, source: "demo" }];
      const colored = colorize(events, DEFAULT_COLORS[0]);
      setDemoEvents(colored);
      if (colored.length) gotoIfPossible(colored[0].start);
    } finally {
      setLoading(false);
    }
  }

  // Load events for given sources (or current sources)
  async function load(overrideSources) {
    const src = overrideSources || sources;
    const toFetch = src.filter((s) => s.url && s.url.trim().length > 0);
    if (toFetch.length === 0) {
      await showDemo();
      return;
    }

    setLoading(true);
    try {
      const promises = toFetch.map(async (s) => {
        try {
          const res = await fetch(`${API}/events?url=${encodeURIComponent(s.url)}`);
          if (!res.ok) {
            const txt = await res.text();
            console.error("GET /events failed for", s.url, res.status, txt);
            return [];
          }
          const events = await res.json();
          return (Array.isArray(events) ? events : []).map((e) => ({ ...e, eventColor: s.color || DEFAULT_COLORS[0] }));
        } catch (err) {
          console.error("Fetch error for", s.url, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const next = src.map((s) => {
        const idx = toFetch.findIndex((t) => t.url === s.url);
        return { ...s, events: idx >= 0 ? results[idx] : [] };
      });
      setSources(next);
      setDemoEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // Load saved urls now (button)
  async function loadSavedNow() {
    try {
      const user = getUsername();
      if (!user) throw new Error("Missing user (frontend)");

      const res = await fetch(`${API}/urls?user=${encodeURIComponent(user)}`);
      if (!res.ok) {
        console.error("GET /urls failed:", res.status, await res.text());
        throw new Error("GET /urls failed");
      }

      const rows = await res.json();
      const next = (Array.isArray(rows) ? rows : []).map((r, i) => ({
        url: r.url || "",
        label: `Lähde ${i + 1}`,
        color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        checked: true,
        events: [],
        id: r.id,
      }));

      if (next.length === 0) {
        setSources([
          { url: "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [] },
          { url: "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [] },
        ]);
        await showDemo();
        return;
      }

      setSources(next);
      await load(next);
    } catch (err) {
      console.error("Error loading saved urls:", err);
      await showDemo();
    }
  }

  const displayedEvents = [
    ...demoEvents,
    ...sources.flatMap((s) => (s.checked ? s.events || [] : [])),
  ];

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Kalenteri-demo (ICS → FullCalendar)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12 }}>{`ICS URL ${i + 1}`}</label>
                <input
                  placeholder="https://…/calendar.ics"
                  value={s.url}
                  onChange={(e) => setSources((prev) => prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p)))}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  title="Poista lähde ja sen tallennus palvelimelta"
                  onClick={async () => {
                    const urlToDelete = s.url?.trim();
                    const idToDelete = s.id;
                    if (!urlToDelete && !idToDelete) {
                      const remainingLocal = sources.filter((_, idx) => idx !== i);
                      setSources(remainingLocal);
                      if (remainingLocal.length === 0) setDemoEvents([]);
                      return;
                    }
                    if (!confirm("Poistetaanko URL palvelimelta ja UI:sta?")) return;
                    try {
                      const remaining = sources.filter((_, idx) => idx !== i);
                      const body = idToDelete ? { id: idToDelete } : { url: urlToDelete };
                      const res = await fetch(`${API}/urls`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...body, user: getUsername() }),
                      });
                      if (!res.ok) throw new Error("Delete failed");
                      setSources(remaining);
                      if (remaining.length > 0) await load(remaining);
                      else setDemoEvents([]);
                    } catch (e) {
                      console.error(e);
                      alert("URLin poisto epäonnistui");
                    }
                  }}
                >
                  Poista
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <button onClick={() => load()} disabled={loading} style={{ height: 36 }}>
              {loading ? "Ladataan…" : hasUrls ? "Hae kalenterit" : "Näytä demodata"}
            </button>

            <button
              onClick={async () => {
                const nonEmpty = sources.map((s) => s.url?.trim()).filter(Boolean);
                try {
                  const username = getUsername();
                  if (!username) throw new Error("Missing user (frontend)");
                  console.log("Saving urls for user:", username, nonEmpty);
                  const res = await fetch(`${API}/urls`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urls: nonEmpty, user: username }),
                  });
                  if (!res.ok) throw new Error("Save failed");
                  await loadSavedNow(); // refresh UI from server (gets ids)
                  alert("Tallennettu");
                } catch (e) {
                  console.error(e);
                  alert("URLien tallennus epäonnistui");
                }
              }}
              style={{ height: 36 }}
            >
              Tallenna URLit
            </button>

            <button onClick={loadSavedNow} style={{ height: 36 }}>
              Lataa tallennetut
            </button>
          </div>

          <div>
            <button
              onClick={() =>
                setSources((prev) => [
                  ...prev,
                  { url: "", label: `Lähde ${prev.length + 1}`, color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length], checked: true, events: [] },
                ])
              }
              style={{ height: 36 }}
            >
              Lisää lähde
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {sources.map((s, i) => (
          <label key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={s.checked} onChange={(e) => setSources((prev) => prev.map((p, idx) => (idx === i ? { ...p, checked: e.target.checked } : p)))} />
            <Legend color={s.color} label={`${s.label}${s.url ? "" : " (demo)"}`} />
          </label>
        ))}
      </div>

      <FullCalendar ref={calRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" height="78vh" events={displayedEvents} />
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 12, height: 12, background: color }} />
      {label}
    </span>
  );
}

function colorize(events, color) {
  const list = Array.isArray(events) ? events : [];
  return list.map((e) => ({ ...e, backgroundColor: color, borderColor: color }));
}
// ...existing code...