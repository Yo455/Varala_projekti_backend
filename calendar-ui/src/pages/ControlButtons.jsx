import { getUsername, DEFAULT_COLORS } from "./calendarUtils.js";

/**
 * ControlButtons - Kalenterin hallintapainikkeiden komponentti
 *
 * Sisältää painikkeet kalenterien lataamiseen, tallentamiseen ja hallintaan
 */
export default function ControlButtons({ sources, setSources, loading, hasUrls, onLoad, onLoadSaved }) {
  const API = "http://localhost:3001";

  const handleSaveUrls = async () => {
    // Kerää kaikki ei-tyhjät URL-osoitteet
    const nonEmpty = sources.map((s) => s.url?.trim()).filter(Boolean);
    try {
      const username = getUsername();
      if (!username) {
        throw new Error("Käyttäjätunnus puuttuu - kirjaudu ensin sisään");
      }

      console.log("Tallennetaan URL-osoitteet käyttäjälle:", username, nonEmpty);
      const res = await fetch(`${API}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: nonEmpty, user: username }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Tallennus epäonnistui: ${res.status} - ${errorText}`);
      }

      // Päivitä UI palvelimen tiedoilla (sisältää ID:t)
      await onLoadSaved();
      alert("URL-osoitteet tallennettu onnistuneesti!");
    } catch (error) {
      console.error("Virhe URL-osoitteiden tallennuksessa:", error);
      alert(`URL-osoitteiden tallennus epäonnistui: ${error.message}`);
    }
  };

  const handleAddSource = () => {
    setSources((prev) => [
      ...prev,
      { url: "", label: `Lähde ${prev.length + 1}`, color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length], checked: true, events: [] },
    ]);
  };

  return (
    <div className="control-buttons">
      <div>
        <button onClick={() => onLoad()} disabled={loading}>
          {loading ? "Ladataan…" : hasUrls ? "Hae kalenterit" : "Näytä demodata"}
        </button>

        <button onClick={handleSaveUrls}>
          Tallenna URLit
        </button>

        {/*
        <button onClick={onLoadSaved} style={{ height: 36 }}>
          Lataa tallennetut
        </button>
        */}
      </div>
      <div>
        <button onClick={handleAddSource}>
          Lisää lähde
        </button>
      </div>
    </div>
  );
}