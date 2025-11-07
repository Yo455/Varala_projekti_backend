import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Backend-API:n osoite ja oletusvärit eri lähteille
const API = "http://localhost:3001";
const DEFAULT_COLORS = ["#1e90ff", "#2ecc71", "#f39c12", "#9b59b6", "#e74c3c"];

export default function Calendar() {
  // sources = käyttäjän syöttämät ICS-lähteet (tekstilaatikot + niihin liittyvät tapahtumat)
  const [sources, setSources] = useState([
    { url: "", label: "Lähde 1", color: "#1e90ff", checked: true, events: [] },
    { url: "", label: "Lähde 2", color: "#2ecc71", checked: true, events: [] },
  ]);

  // loading = näytön/disablauslogiikka hakujen aikana
  const [loading, setLoading] = useState(false);

  // demoEvents = demodatan tapahtumat, kun URLeja ei ole (pidetään erillään sources.events:istä)
  const [demoEvents, setDemoEvents] = useState([]);

  // calRef = FullCalendar-instanssin ref, jotta voidaan hypätä tiettyyn päivään (gotoDate)
  const calRef = useRef(null);

  // Apufunktio: jos iso-aikaleima on olemassa, siirrä kalenteri kyseiseen päivään
  function gotoIfPossible(iso) {
    if (!iso || !calRef.current) return;
    try {
      calRef.current.getApi().gotoDate(iso);
    } catch {}
  }

  // Lataa tallennetut URLit heti komponentin mountissa:
  // - jos URLeja ei ole → näytä demodata
  // - jos URLeja on → lataa niiden tapahtumat
  useEffect(() => {
    async function loadSavedOnMount() {
      try {
        const res = await fetch(`${API}/urls`);
        if (!res.ok) return;
        const data = await res.json();

        // Normalisoi muotoon { id, url }
        const urls = Array.isArray(data)
          ? data.map((d) =>
              typeof d === "string" ? { id: undefined, url: d } : { id: d.id, url: d.url }
            )
          : [];

        // Täytä kaksi ensimmäistä lähdettä palvelimen palauttamilla arvoilla (jos löytyy)
        const next = [...(sources || [])];
        next[0] = {
          ...(next[0] || { label: "Lähde 1", color: "#1e90ff", checked: true, events: [] }),
          url: urls[0]?.url || "",
          id: urls[0]?.id,
        };
        next[1] = {
          ...(next[1] || { label: "Lähde 2", color: "#2ecc71", checked: true, events: [] }),
          url: urls[1]?.url || "",
          id: urls[1]?.id,
        };
        setSources(next);

        // Päätä näytetäänkö demot vai haetaanko oikeat kalenterit
        if (!urls[0]?.url && !urls[1]?.url) {
          await showDemo();
        } else {
          await load(next);
        }
      } catch (e) {
        console.warn("Could not load saved urls:", e);
      }
    }
    loadSavedOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onko vähintään yksi URL syötettynä?
  const hasUrls = useMemo(() => sources.some((s) => s.url.trim().length > 0), [sources]);

  // Näytä demodata (haetaan backendin /events ilman parametreja → palauttaa kovakoodatut demot)
  // Ei koske sources-tilaan: demot pidetään omassa tilassaan (demoEvents)
  async function showDemo() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/events`);
      const data = await res.json();
      const events = Array.isArray(data) ? data : [];
      const colored = colorize(events, DEFAULT_COLORS[0]); // väritys yhtenäiseksi
      setDemoEvents(colored); // näytetään demot
      if (colored.length > 0) gotoIfPossible(colored[0].start); // hyppää ensimmäiseen tapahtumaan
    } catch (e) {
      console.error(e);
      alert(`Demon haku epäonnistui: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  // Lataa tapahtumat annetuista (tai nykyisistä) lähteistä.
  // Jos yksikään lähde ei sisällä URLia → näytä demodata.
  async function load(overrideSources) {
    setLoading(true);
    try {
      const usedSources = overrideSources || sources;
      const nonEmpty = usedSources.filter((s) => s.url.trim());

      // Ei URLeja → demot esiin
      if (nonEmpty.length === 0) {
        await showDemo();
        return;
      }

      // Jos haetaan oikeita kalentereita, piilota demot
      setDemoEvents([]);

      // Hae jokaisen lähteen tapahtumat erikseen
      const results = await Promise.all(
        usedSources.map(async (s) => {
          if (!s.url.trim()) return [];
          const params = new URLSearchParams();
          params.append("url", s.url.trim());
          const res = await fetch(`${API}/events?${params.toString()}`);
          const data = await res.json();
          if (data.error) throw new Error(data.detail || data.error);
          return Array.isArray(data) ? data : [];
        })
      );

      // Päivitä lähteiden events-listat vastaamaan hakutuloksia (värit päälle)
      setSources((prev) =>
        (overrideSources || prev).map((s, i) => ({
          ...s,
          events: colorize(results[i] || [], s.color),
        }))
      );

      // Jos vähintään yksi tapahtuma löytyi, hyppää sen päivään
      const flattened = results.flat();
      if (flattened.length > 0) gotoIfPossible(flattened[0]?.start);
    } catch (e) {
      console.error(e);
      alert(`Tietojen haku epäonnistui: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  // Mikä näytetään kalenterissa:
  // - jos demoEvents ei ole tyhjä → näytä demot
  // - muuten näytä valittujen (checked) lähteiden tapahtumat
  const displayedEvents = useMemo(() => {
    if (demoEvents.length > 0) return demoEvents;
    return sources.filter((s) => s.checked).flatMap((s) => s.events);
  }, [sources, demoEvents]);

  // “Lataa tallennetut” -nappi: kysyy uudestaan /urls, täyttää kentät ja hakee tapahtumat
  async function loadSavedNow() {
    try {
      const res = await fetch(`${API}/urls`);
      if (!res.ok) throw new Error("GET /urls failed");
      const data = await res.json();

      // Normalisoi muotoon { id, url }
      const urls = Array.isArray(data)
        ? data.map((d) => (typeof d === "string" ? { id: undefined, url: d } : { id: d.id, url: d.url }))
        : [];

      // Kirjoita kaksi ensimmäistä lähdettä
      const next = [...(sources || [])];
      next[0] = {
        ...(next[0] || { label: "Lähde 1", color: "#1e90ff", checked: true, events: [] }),
        url: urls[0]?.url || "",
        id: urls[0]?.id,
      };
      next[1] = {
        ...(next[1] || { label: "Lähde 2", color: "#2ecc71", checked: true, events: [] }),
        url: urls[1]?.url || "",
        id: urls[1]?.id,
      };
      setSources(next);

      // Lataa events näille lähteille
      await load(next);
    } catch (e) {
      console.error(e);
      alert(`Tallennettujen URLien haku epäonnistui: ${e.message || e}`);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Kalenteri-demo (ICS → FullCalendar)</h2>

      {/* Ylärivi: URL-kentät + toiminnot */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        {/* Vasemmalla: dynaaminen lista lähteiden syöttökenttiä */}
        <div style={{ display: "grid", gap: 8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12 }}>{`ICS URL ${i + 1}`}</label>
                <input
                  placeholder="https://…/calendar.ics"
                  value={s.url}
                  onChange={(e) =>
                    setSources((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p))
                    )
                  }
                  style={{ width: "100%" }}
                />
              </div>

              {/* Poista-nappi:
                  - jos rivillä ei ole id tai url → poistaa vain UI:sta
                  - jos on id/url → poistaa myös kannasta ja päivittää näkymän heti */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  title="Poista lähde ja sen tallennus palvelimelta"
                  onClick={async () => {
                    const urlToDelete = s.url?.trim();
                    const idToDelete = s.id;

                    // Ei id:tä eikä urlia → pelkkä UI-rivin poisto
                    if (!urlToDelete && !idToDelete) {
                      const remainingLocal = sources.filter((_, idx) => idx !== i);
                      setSources(remainingLocal);
                      if (remainingLocal.length === 0) setDemoEvents([]); // jos ei yhtään riviä → tyhjä näkymä
                      return;
                    }
                    if (!confirm("Poistetaanko URL palvelimelta ja UI:sta?")) return;

                    try {
                      // Laske etukäteen jäljelle jäävät rivit (ettei setState aiheuta viivettä)
                      const remaining = sources.filter((_, idx) => idx !== i);

                      // Poista kannasta id:llä (ensisijainen) tai urlilla (fallback)
                      const body = idToDelete ? { id: idToDelete } : { url: urlToDelete };
                      const res = await fetch(`${API}/urls`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                      });
                      if (!res.ok) throw new Error("Delete failed");

                      // Päivitä UI heti pois
                      setSources(remaining);

                      // Jos rivejä jäi → hae niiden tapahtumat, muuten tyhjennä demot
                      if (remaining.length > 0) {
                        await load(remaining);
                      } else {
                        setDemoEvents([]);
                      }
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

        {/* Oikealla: toimintonapit */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "inline-flex", gap: 8 }}>
            {/* Hae kalenterit / Näytä demodata (riippuen onko URLeja) */}
            <button onClick={() => load()} disabled={loading} style={{ height: 36 }}>
              {loading ? "Ladataan…" : hasUrls ? "Hae kalenterit" : "Näytä demodata"}
            </button>

            {/* Tallenna syötetyt URLit kantaan ja päivitä UI id:illä */}
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

                  // Hae heti tallennetut rivit palauttaaksesi id:t UI:lle
                  const refreshed = await fetch(`${API}/urls`);
                  if (refreshed.ok) {
                    const data = await refreshed.json();
                    const urls = Array.isArray(data)
                      ? data.map((d) =>
                          typeof d === "string" ? { id: undefined, url: d } : { id: d.id, url: d.url }
                        )
                      : [];
                    setSources((prev) => [
                      {
                        ...prev[0],
                        url: urls[0]?.url || prev[0]?.url || "",
                        id: urls[0]?.id || prev[0]?.id,
                      },
                      {
                        ...prev[1],
                        url: urls[1]?.url || prev[1]?.url || "",
                        id: urls[1]?.id || prev[1]?.id,
                      },
                    ]);
                    alert(`Tallennettu ${urls.length} URL(ia)`);
                  } else {
                    alert("Tallennettu, mutta päivitys epäonnistui");
                  }
                } catch (e) {
                  console.error(e);
                  alert("URLien tallennus epäonnistui");
                }
              }}
              style={{ height: 36 }}
            >
              Tallenna URLit
            </button>

            {/* Lataa kantaan tallennetut URLit takaisin kenttiin (ja hae niiden tapahtumat) */}
            <button onClick={loadSavedNow} style={{ height: 36 }}>
              Lataa tallennetut
            </button>
          </div>

          {/* Lisää uusi tyhjä lähderivi */}
          <div>
            <button
              onClick={() =>
                setSources((prev) => [
                  ...prev,
                  {
                    url: "",
                    label: `Lähde ${prev.length + 1}`,
                    color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
                    checked: true,
                    events: [],
                  },
                ])
              }
              style={{ height: 36 }}
            >
              Lisää lähde
            </button>
          </div>
        </div>
      </div>

      {/* Checkboxit: voit piilottaa/näyttää kunkin lähteen tapahtumat ilman poistamista */}
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
          <label key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={s.checked}
              onChange={(e) =>
                setSources((prev) =>
                  prev.map((p, idx) => (idx === i ? { ...p, checked: e.target.checked } : p))
                )
              }
            />
            <Legend color={s.color} label={`${s.label}${s.url ? "" : " (demo)"}`} />
          </label>
        ))}
      </div>

      {/* Varsinainen kalenterikomponentti */}
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="78vh"
        events={displayedEvents}
      />
    </div>
  );
}

// Selitelegendan värineliö + teksti
function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 12, height: 12, background: color }} />
      {label}
    </span>
  );
}

// Lisää FullCalendarin väriattribuutit eventteihin (näkyy kalenterissa)
function colorize(events, color) {
  const list = Array.isArray(events) ? events : [];
  return list.map((e) => ({
    ...e,
    backgroundColor: color,
    borderColor: color,
  }));
}
