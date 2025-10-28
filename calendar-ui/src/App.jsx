import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const API = "http://localhost:3001"; // backendin osoite

export default function App() {
  const [sources, setSources] = useState([
    { url: "", label: "Lähde ", color: "#1e90ff", checked: true, events: [] },
    { url: "", label: "Lähde 2", color: "#2ecc71", checked: true, events: [] },
  ]);

  const [loading, setLoading] = useState(false);

  const hasUrls = useMemo(
    () => sources.some((s) => s.url.trim().length > 0),
    [sources]
  );

  async function load() {
    setLoading(true);
    try {
      const nonEmpty = sources.filter((s) => s.url.trim());

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
        sources.map(async (s) => {
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
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div>
          <label style={{ fontSize: 12 }}>ICS URL 1</label>
          <input
            placeholder="https://…/calendar.ics"
            value={sources[0].url}
            onChange={(e) =>
              setSources(([a, b]) => [{ ...a, url: e.target.value }, b])
            }
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12 }}>ICS URL 2 (valinnainen)</label>
          <input
            placeholder="https://…/calendar.ics"
            value={sources[1].url}
            onChange={(e) =>
              setSources(([a, b]) => [a, { ...b, url: e.target.value }])
            }
            style={{ width: "100%" }}
          />
        </div>
        <button onClick={load} disabled={loading} style={{ height: 36 }}>
          {loading ? "Ladataan…" : hasUrls ? "Hae kalenterit" : "Näytä demodata"}
        </button>
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
