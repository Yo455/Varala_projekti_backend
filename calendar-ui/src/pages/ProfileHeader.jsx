import { getUsername } from "./calendarUtils.js";

/**
 * ProfileHeader - Profiilin näyttö ja uloskirjautuminen
 *
 * Näyttää aktiivisen profiilin tiedot ja tarjoaa uloskirjautumis-toiminnallisuuden
 */
export default function ProfileHeader({ activeProfile, onLogout }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "12px", backgroundColor: "#f8f9fa", borderRadius: 8 }}>
      <div>
        <h3 style={{ margin: 0, marginBottom: 4 }}>Aktiivinen profiili: {activeProfile ? activeProfile.name : "Ei valittua profiilia"}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
          Käyttäjä: {getUsername() || "Ei kirjautunut"}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onLogout} style={{ height: 36, backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: 4, padding: "0 12px", cursor: "pointer" }}>
          Kirjaudu ulos
        </button>
      </div>
    </div>
  );
}