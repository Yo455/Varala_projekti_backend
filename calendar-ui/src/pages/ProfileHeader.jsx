import { getUsername } from "./calendarUtils.js";
import Navigation from '../routes/Navigation'

/**
 * ProfileHeader - Profiilin näyttö ja uloskirjautuminen
 *
 * Näyttää aktiivisen profiilin tiedot ja tarjoaa uloskirjautumis-toiminnallisuuden
 */
export default function ProfileHeader({ activeProfile, onLogout }) {
  return (
    <div className="profile-header">
      <div>
        <h3 className="profile-active">Aktiivinen profiili: {activeProfile ? activeProfile.name : "Ei valittua profiilia"}</h3>
        <p className="profile-user">
          Käyttäjä: {getUsername() || "Ei kirjautunut"}
        </p>
      </div>
    <div>
       <Navigation />
    </div>
      <div className="profile-header">
        <button onClick={onLogout} className="profile-button">
          Kirjaudu ulos
        </button>
      </div>
    </div>
  );
}