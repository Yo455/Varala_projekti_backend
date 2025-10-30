import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const API = "http://localhost:3001"; // backendin osoite
const DEFAULT_COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

export default function App() {
  const [sources, setSources] = useState([
    { url: "", label: "Lähde ", color: "#1e90ff", checked: true, events: [] },
    { url: "", label: "Lähde 2", color: "#2ecc71", checked: true, events: [] },
  ]);

  const [loading, setLoading] = useState(false);

  // Load saved URLs from backend on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch(`${API}/urls`);
        if (!res.ok) return;
        const urls = await res.json();
        // populate first two sources with saved urls (if any) and auto-load events
        const next = [...(sources || [])];
        next[0] = { ...(next[0] || { label: "Lähde ", color: "#1e90ff", checked: true, events: [] }), url: urls[0] || "" };
        next[1] = { ...(next[1] || { label: "Lähde 2", color: "#2ecc71", checked: true, events: [] }), url: urls[1] || "" };
        setSources(next);
        // fetch events for the restored URLs so they appear immediately
        try {
          await load(next);
        } catch (e) {
          console.warn("Auto-load after restoring urls failed:", e);
        }
      } catch (e) {
        console.warn("Could not load saved urls:", e);
      }
    }
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUrls = useMemo(
    () => sources.some((s) => s.url.trim().length > 0),
    [sources]
  );

  // load events from current `sources` state or from an optional override
  async function load(overrideSources) {
    setLoading(true);
    try {
      const usedSources = overrideSources || sources;
      const nonEmpty = usedSources.filter((s) => s.url.trim());

      // Jos kaikki URLit tyhjiä → näytetään demo
      if (nonEmpty.length === 0) {
        const res = await fetch(`${API}/events`);
        const data = await res.json();
        setSources((prev) => [
          { ...prev[0], events: colorize(data, prev[0].color) },
          { ...prev[1], events: [] },
        ]);
        return;
      }

      // Muutoin haetaan jokaiselle lähteelle erikseen
      const results = await Promise.all(
        usedSources.map(async (s) => {
          if (!s.url.trim()) return [];
          const params = new URLSearchParams();
          params.append("url", s.url.trim());
          const res = await fetch(`${API}/events?${params.toString()}`);
          const data = await res.json();
          if (data.error) {
            throw new Error(data.detail || data.error);
          }
          return Array.isArray(data) ? data : [];
        })
      );

      setSources((prev) =>
        prev.map((s, i) => ({
          ...s,
          events: colorize(results[i] || [], s.color),
        }))
      );
    } catch (e) {
      console.error(e);
      alert(`Tietojen haku epäonnistui: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // näyttää demodatan heti, jos URLit ovat tyhjät
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Näytettävät tapahtumat = vain valittujen lähteiden tapahtumat
  const displayedEvents = useMemo(() => {
    return sources.filter((s) => s.checked).flatMap((s) => s.events);
  }, [sources]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Kalenteri-demo (ICS → FullCalendar)</h2>

      {/* URL-kentät ja haku */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12 }}>{`ICS URL ${i + 1}`}</label>
                <input
                  placeholder="https://…/calendar.ics"
                  value={s.url}
                  onChange={(e) =>
                    setSources((prev) => prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p)))
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  title="Poista lähde ja sen tallennus palvelimelta"
                  onClick={async () => {
                    const urlToDelete = s.url?.trim();
                    if (!urlToDelete) {
                      // just remove the input
                      setSources((prev) => prev.filter((_, idx) => idx !== i));
                      return;
                    }
                    if (!confirm("Poistetaanko URL palvelimelta ja UI:sta?")) return;
                    try {
                      const res = await fetch(`${API}/urls`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: urlToDelete }),
                      });
                      if (!res.ok) throw new Error("Delete failed");
                      // remove from UI
                      setSources((prev) => prev.filter((_, idx) => idx !== i));
                      // reload events
                      await load();
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
                  const res = await fetch(`${API}/urls`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urls: nonEmpty }),
                  });
                  if (!res.ok) throw new Error("Save failed");
                  const saved = await res.json();
                  alert(`Tallennettu ${saved.length} URL(ia)`);
                } catch (e) {
                  console.error(e);
                  alert("URLien tallennus epäonnistui");
                }
              }}
              style={{ height: 36 }}
            >
              Tallenna URLit
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

      {/* Checkboxit ja selitteet */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        {sources.map((s, i) => (
          <label
            key={i}
            style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={s.checked}
              onChange={(e) =>
                setSources((prev) =>
                  prev.map((p, idx) =>
                    idx === i ? { ...p, checked: e.target.checked } : p
                  )
                )
              }
            />
            <Legend color={s.color} label={`${s.label}${s.url ? "" : " (demo)"}`} />
          </label>
        ))}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="78vh"
        events={displayedEvents}
      />
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
  // 🧩 Kohta B: varmista, että events on taulukko
  const list = Array.isArray(events) ? events : [];
  return list.map((e) => ({
    ...e,
    backgroundColor: color,
    borderColor: color,
  }));
}
