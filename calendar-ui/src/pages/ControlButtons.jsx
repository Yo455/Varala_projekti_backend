import { getUsername, DEFAULT_COLORS } from "./calendarUtils.js";

/**
 * ControlButtons - Kalenterin hallintapainikkeiden komponentti
 *
 * Sisältää painikkeet kalenterien lataamiseen, tallentamiseen ja hallintaan
 */
export default function ControlButtons({ sources, setSources, loading, hasUrls, onLoad, onLoadSaved }) {
  const API = "http://localhost:3001";

  const handleSaveUrls = async () => {
    // Kerää kaikki ei-tyhjät URL-osoitteet, poista tyhjät ja lähetä ne backendille tallennettavaksi, trimmataan whitespace pois
    const nonEmpty = sources.map((s) => s.url?.trim()).filter(Boolean); // suodattaa pois tyhjät merkkijonot, nullit ja undefinedit, boolean muuntaa arvon totuusarvoksi
    try {
      const username = getUsername();
      if (!username) { // varmista että käyttäjätunnus on saatavilla, muuten heitä virhe
        throw new Error("Käyttäjätunnus puuttuu - kirjaudu ensin sisään");
      }

      console.log("Tallennetaan URL-osoitteet käyttäjälle:", username, nonEmpty); // Lokita tallennettavat URLit
      const res = await fetch(`${API}/urls`, {  // lähetä pyyntö backendille, odota vastausta
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: nonEmpty, user: username }),
      });

      if (!res.ok) { // jos vastaus ei ole ok, heitä virhe, muuten jatka
        const errorText = await res.text();
        throw new Error(`Tallennus epäonnistui: ${res.status} - ${errorText}`);
      }

      // Päivitä UI palvelimen tiedoilla (sisältää ID:t)
      await onLoadSaved(); //odotetaam enne kuin suoritetaan fuktio, sitten näytetään alert että urlit tallennettu tietokantaan
      alert("URL-osoitteet tallennettu onnistuneesti!");
    } catch (error) {
      console.error("Virhe URL-osoitteiden tallennuksessa:", error); // Lokita virhe konsoliin
      alert(`URL-osoitteiden tallennus epäonnistui: ${error.message}`); // Näytä virhe käyttäjälle, jos ei onnistu urlien tallennus
    }
  };

  const handleAddSource = () => {
    setSources((prev) => [
      ...prev, // spread operatori, joka kopioi vanhan taulukon sisällön uuteen taulukkoon, sitten lisätään uusi objekti loppuun
      { url: "", label: `Lähde ${prev.length + 1}`, color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length], checked: true, events: [] }, 
      // uusi lähdeobjekti, jossa oletusarvot, väri kiertää käytettävissä olevien värien listan mukaan
    ]);
  };
 
  //palauttaa controlbuttons komponentin, joka sisältää painikkeet kalenterien lataamiseen, tallentamiseen ja hallintaan
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