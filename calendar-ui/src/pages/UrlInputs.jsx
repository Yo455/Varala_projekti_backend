import React, { useEffect } from "react";
import { getUsername } from "./calendarUtils.js";

/**
 * UrlInputs - Kalenterilähteiden syöttökenttien komponentti
 *
 * Hallinnoi URL-osoitteiden syöttöä ja poistamista
 */
export default function UrlInputs({ sources, setSources, onLoad }) {
  const API = "http://localhost:3001";

  // Tarkista duplikaatit — jos sama URL esiintyy useammin kuin kerran, näytä alert
  useEffect(() => {
    if (!Array.isArray(sources) || sources.length === 0) return;
    const counts = {};
    for (const s of sources) {
      const u = (s?.url || "").trim().toLowerCase();
      // Normalisoi URL (trim + lower), jotta duplikaattitarkistus on kirjainkoosta riippumaton ja ylimääräiset välilyönnit poistuvat
      if (!u) continue;
      counts[u] = (counts[u] || 0) + 1;
      // Laske esiintymät
    }
    const duplicates = Object.keys(counts).filter((k) => counts[k] > 1);
    // Jos duplikaatteja löytyy, näytä alert. filteröi avaimet, joiden arvo on suurempi kuin 1, eli esiintyy useammin kuin kerran.
    //Object.keys palauttaa taulukon, jossa on kaikki counts-olion avaimet.
    if (duplicates.length > 0) {
      // Kerrotaan käyttäjälle, että sama osoite löytyy useammin kuin kerran
      alert(`Sama URL löytyy useamman kerran: ${duplicates.join(", ")}`);
    }
  }, [sources]);

  // Poista URL-osoite palvelimelta ja päivitä UI
  const handleDeleteSource = async (index) => {
    const source = sources[index];
    //sources on objekti, josta poistetaan url ja id, index on poistettavan kohdan indeksi
    const urlToDelete = source.url?.trim().toLowerCase();
    // Normalisoi URL (trim + lower), jotta poisto on kirjainkoosta riippumaton ja ylimääräiset välilyönnit poistuvat
    const idToDelete = source.id;
    //idToDelete on palvelimen antama tunniste, jota käytetään poiston kohdistamiseen, sourc

    // Jos URL tai ID puuttuu, poista vain paikallisesti
    if (!urlToDelete && !idToDelete) {
      console.info("Poistetaan lähde vain paikallisesti (ei tallennettu palvelimelle)");
      const remainingLocal = sources.filter((_, idx) => idx !== index);
      setSources(remainingLocal);
      if (remainingLocal.length === 0) {
        // Parent component will handle demo events
      }
      return;
    }

    // Varmista käyttäjältä poisto palvelimelta
    if (!confirm("Poistetaanko URL palvelimelta ja UI:sta?")) return;

    try {
      const remaining = sources.filter((_, idx) => idx !== index);
      // Lähetä DELETE-pyyntö palvelimelle, nuolifunktion avulla
      const body = idToDelete ? { id: idToDelete } : { url: urlToDelete };

      console.log("Poistetaan URL palvelimelta:", body);
      const res = await fetch(`${API}/urls`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }, //json-header
        body: JSON.stringify({ ...body, user: getUsername() }),
      });

      if (!res.ok) { // Tarkista vastaus
        const errorText = await res.text();
        throw new Error(`Poisto epäonnistui: ${res.status} - ${errorText}`);
        //heitä virhe, jos poisto epäonnistuu
      }

      // Päivitä UI
      setSources(remaining);
      if (remaining.length > 0) await onLoad(remaining);
      // Parent component will handle demo events

      console.log("URL poistettu onnistuneesti");
    } catch (error) {
      console.error("Virhe URL:n poistossa:", error);
      // Näytä virheilmoitus käyttäjälle konsoliin
      alert(`URL:n poisto epäonnistui: ${error.message}`);
    }
  };

  return (
    <div className="sources-list">
      {sources.map((s, i) => (
        <div key={i} className="sources-row">
          <div className="url-input">
            <label>{`ICS URL ${i + 1}`}</label>
            <input
              placeholder="https://…/calendar.ics"
              value={s.url}
              onChange={(e) => setSources((prev) => prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p)))}
            />
          </div>
          <div>
            <button
              title="Poista lähde ja sen tallennus palvelimelta"
              onClick={() => handleDeleteSource(i)}
            >
              Poista
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}