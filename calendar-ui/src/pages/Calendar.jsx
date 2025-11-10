/**
 * Calendar.jsx - Kalenterisovelluksen pääkomponentti
 *
 * Tämä komponentti tarjoaa seuraavat ominaisuudet:
 * - ICS-kalenterien näyttäminen FullCalendar-kirjastolla
 * - Useiden kalenterilähteiden hallinta (max 2 per profiili)
 * - Profiilikohtainen tallennus ja lataus
 * - Kalenteritapahtumien reaaliaikainen haku ja näyttö
 * - Demotila jos ei ole tallennettuja kalentereita
 *
 * Tekninen toteutus:
 * - React hooks state management
 * - FullCalendar integraatio
 * - localStorage profiilien tallennukseen
 * - REST API backend-viestintä
 * - Virheiden käsittely ja käyttäjäilmoitukset (alertit, console)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getUsername, getActiveProfile, colorize, DEFAULT_COLORS } from "./calendarUtils.js";
import Legend from "./Legend.jsx";
import ProfileHeader from "./ProfileHeader.jsx";
import UrlInputs from "./UrlInputs.jsx";
import ControlButtons from "./ControlButtons.jsx";
import SourceCheckboxes from "./SourceCheckboxes.jsx";

// API-osoite backend-palveluun
const API = "http://localhost:3001";

export default function Calendar() {
  // Navigointi hook React Routerista
  const navigate = useNavigate();

  // Kalenterilähteiden tila (max 2 lähdettä profiilia kohden)
  const [sources, setSources] = useState([
    { url: "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [] },
    { url: "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [] },
  ]);

  // Latauksen tila UI:n päivittämistä varten
  const [loading, setLoading] = useState(false);

  // Demotapahtumat kun ei ole oikeita kalentereita, esim. käyttäjä ei ole tallentanut URL-osoitteita
  const [demoEvents, setDemoEvents] = useState([]);

  // Aktiivinen profiili, joka on valittuna
  const [activeProfile, setActiveProfile] = useState(null);

  // Viittaus FullCalendar-komponenttiin, jotta voidaan kutsua metodeja
  const calRef = useRef(null);

  // Lataa aktiivinen profiili komponentin mountissa
  useEffect(() => {
    const currentProfile = getActiveProfile();
    setActiveProfile(currentProfile);
  }, []);

  /**
   * Siirtää kalenterin näkymän tiettyyn päivämäärään
   * @param {string} iso - ISO-muotoinen päivämäärä (valinnainen)
   */
  function gotoIfPossible(iso) {
    if (!iso || !calRef.current) {
      console.warn("gotoIfPossible: Ei päivämäärää tai kalenteriviitettä");
      return;
    }
    try {
      calRef.current.getApi().gotoDate(iso);
    } catch (error) {
      console.error("Virhe kalenterin päivämäärän siirrossa:", error);
    }
  }

  /**
   * Kirjaa käyttäjän ulos ja ohjaa login-sivulle
   * Tyhjentää autentikoinnin localStoragesta
   */
  function handleLogout() {
    try {
      localStorage.removeItem("auth");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Virhe uloskirjautumisessa:", error);
      // Jatka silti navigointia vaikka localStorage epäonnistuu
      navigate("/", { replace: true });
    }
  }

  /**
   * Lataa tietyn käyttäjänimen profiilin URL-osoitteet backendistä
   * Päivittää sources-tilan ladatuilla URL-osoitteilla
   * @param {string} username - Käyttäjänimi jonka URL-osoitteet ladataan
   */
  async function loadProfileUrls(username) {
    try {
      const res = await fetch(`${API}/urls?user=${encodeURIComponent(username)}`);
      if (!res.ok) {
        console.warn("GET /urls epäonnistui profiilille:", username, "Status:", res.status);
        // Tyhjennä sources jos ei löydy tietoja
        setSources([
          { url: "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [] },
          { url: "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [] },
        ]);
        await showDemo();
        return;
      }

      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];

      // Luo uusi sources-taulukko profiilin URL-osoitteille (max 2 kuten alkuperäinen järjestelmä)
      const next = [
        { url: rows[0]?.url || "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [], id: rows[0]?.id || undefined },
        { url: rows[1]?.url || "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [], id: rows[1]?.id || undefined },
      ];
      setSources(next);

      if (!rows[0]?.url && !rows[1]?.url) await showDemo();
      else await load(next);
    } catch (error) {
      console.error("Virhe profiilin URL-osoitteiden latauksessa:", error);
      await showDemo();
    }
  }

  // On mount: try to load saved urls for current user (if any), otherwise show local demo
  useEffect(() => {
    async function loadSavedOnMount() {
      try {
        const user = getUsername();
        if (!user) {
          console.info("Ei aktiivista käyttäjää, näytetään demo");
          await showDemo();
          return;
        }

        await loadProfileUrls(user);
      } catch (error) {
        console.error("Virhe komponentin alustuksessa:", error);
        await showDemo();
      }
    }
    loadSavedOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUrls = useMemo(() => sources.some((s) => s.url && s.url.trim().length > 0), [sources]);

  /**
   * Näyttää demotapahtumia kun ei ole oikeita kalentereita
   * Luo satunnaisen tapahtuman seuraavalle tunnille
   */
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
    } catch (error) {
      console.error("Virhe demonäytössä:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Lataa tapahtumat annetuille kalenterilähdeille
   * Hakee tapahtumat backendistä ja päivittää sources-tilan
   * @param {Array} overrideSources - Valinnaiset lähteet (käyttää sources-tilaa jos ei annettu)
   */
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
            console.error("GET /events epäonnistui URL:lle", s.url, "Status:", res.status, "Vastaus:", txt);
            return [];
          }
          const events = await res.json();
          return (Array.isArray(events) ? events : []).map((e) => ({ ...e, eventColor: s.color || DEFAULT_COLORS[0] }));
        } catch (error) {
          console.error("Hakuvirhe URL:lle", s.url, error);
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
    } catch (error) {
      console.error("Virhe tapahtumien latauksessa:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Lataa tallennetut URL-osoitteet backendistä ja päivittää UI:n
   * Käytetään "Lataa tallennetut" napin toiminnassa
   */
  async function loadSavedNow() {
    try {
      const user = getUsername();
      if (!user) {
        throw new Error("Käyttäjätunnus puuttuu");
      }

      const res = await fetch(`${API}/urls?user=${encodeURIComponent(user)}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("GET /urls epäonnistui:", res.status, errorText);
        throw new Error(`URL-osoitteiden lataus epäonnistui: ${res.status}`);
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
        // Ei tallennettuja URL-osoitteita
        setSources([
          { url: "", label: "Lähde 1", color: DEFAULT_COLORS[0], checked: true, events: [] },
          { url: "", label: "Lähde 2", color: DEFAULT_COLORS[1], checked: true, events: [] },
        ]);
        await showDemo();
        return;
      }

      setSources(next);
      await load(next);
    } catch (error) {
      console.error("Virhe tallennettujen URL-osoitteiden latauksessa:", error);
      alert("Tallennettujen URL-osoitteiden lataus epäonnistui");
      await showDemo();
    }
  }

  // Yhdistetyt tapahtumat kaikista aktiivisista lähteistä + demotapahtumat
  const displayedEvents = [
    ...demoEvents,
    ...sources.flatMap((s) => (s.checked ? s.events || [] : [])),
  ];

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>

      <ProfileHeader
        activeProfile={activeProfile}
        onLogout={handleLogout}
      />

      <h2>Kalenteri-demo (ICS → FullCalendar)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <UrlInputs sources={sources} setSources={setSources} onLoad={load} />

        <ControlButtons
          sources={sources}
          setSources={setSources}
          loading={loading}
          hasUrls={hasUrls}
          onLoad={load}
          onLoadSaved={loadSavedNow}
        />
      </div>

      <SourceCheckboxes sources={sources} setSources={setSources} />

      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="78vh"
        events={displayedEvents}
        firstDay={1}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
      />
    </div>
  );
}