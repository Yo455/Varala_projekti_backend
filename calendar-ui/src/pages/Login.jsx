import React, { useState, useEffect } from "react";

import { useNavigate, useLocation } from "react-router-dom";



export default function Login() {

    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState(""); // tyhjä oletusarvo
    const [password, setPassword] = useState("test"); // valmiiksi täytetty 
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [profiles, setProfiles] = useState([]);
    const [activeProfile, setActiveProfile] = useState(null);
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    const API = "http://localhost:3001"; // backendin osoite 

    // Lataa profiilit palvelimelta (tai localStoragesta, jos palvelin ei vastaa)
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API}/profiles`);
                if (!res.ok) throw new Error('Failed fetching profiles');
                const list = await res.json();
                setProfiles(list || []);

                // säilytä aiemmin valittu aktiivinen profiili paikallisesti
                const savedActiveProfile = localStorage.getItem("activeProfile");
                if (savedActiveProfile) {
                    const active = (list || []).find(p => String(p.id) === String(savedActiveProfile));
                    if (active) {
                        setActiveProfile(active);
                        setUsername(active.username);
                    }
                }
            } catch (e) {
                console.error("Virhe profiilien lataamisessa palvelimelta, käytetään localStorage:", e.message);
                const savedProfiles = localStorage.getItem("profiles");
                const savedActiveProfile = localStorage.getItem("activeProfile");
                if (savedProfiles) {
                    try {
                        const parsedProfiles = JSON.parse(savedProfiles);
                        setProfiles(parsedProfiles);
                            if (savedActiveProfile) {
                                const active = parsedProfiles.find(p => String(p.id) === String(savedActiveProfile));
                                if (active) {
                                    setActiveProfile(active);
                                    setUsername(active.username);
                                }
                            }
                    } catch (e2) {
                        console.error("Virhe localStorage-profiilien lataamisessa:", e2);
                    }
                }
            }
        };
        load();
    }, []);

    // Profiilin lisääminen
    function addProfile(name) {
        if (!name.trim()) return;
        const payload = { name: name.trim(), username: name.trim() };
        (async () => {
            try {
                const res = await fetch(`${API}/profiles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!res.ok) throw new Error('Failed creating profile');
                const resp = await res.json();
                // resp may be a single created profile or the full list
                let updatedProfiles = Array.isArray(resp) ? resp : [resp];
                // if server returned only created profile, merge with current list
                if (updatedProfiles.length === 1) {
                    updatedProfiles = [...profiles, updatedProfiles[0]];
                }
                setProfiles(updatedProfiles);
                // store a local copy as fallback
                localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
                // mark newly created profile as active
                let created = null;
                if (Array.isArray(resp) && resp.length === 1) created = resp[0];
                if (!created) created = updatedProfiles.find(p => String(p.username) === String(payload.username)) || updatedProfiles[updatedProfiles.length - 1];
                if (created) {
                    setActiveProfile(created);
                    setUsername(created.username);
                    localStorage.setItem("activeProfile", String(created.id));
                }
                setNewProfileName("");
                setShowAddProfile(false);
            } catch (err) {
                console.error('Lisäyksessä virhe, tallennetaan localStorageen:', err.message);
                const newProfile = { id: Date.now().toString(), name: name.trim(), username: name.trim(), createdAt: new Date().toISOString() };
                const updatedProfiles = [...profiles, newProfile];
                setProfiles(updatedProfiles);
                localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
                // set local fallback profile active
                setActiveProfile(newProfile);
                setUsername(newProfile.username);
                localStorage.setItem("activeProfile", newProfile.id);
                setNewProfileName("");
                setShowAddProfile(false);
            }
        })();
    }

    // Profiilin valitseminen
    function selectProfile(profile) {
        setActiveProfile(profile);
        setUsername(profile.username);
        localStorage.setItem("activeProfile", profile.id);
    }

    // Profiilin poistaminen
    function deleteProfile(profileId) {
        (async () => {
            try {
                const res = await fetch(`${API}/profiles/${profileId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed deleting profile');
                const list = await res.json();
                setProfiles(list || []);
                localStorage.setItem("profiles", JSON.stringify(list || []));
                if (activeProfile && String(activeProfile.id) === String(profileId)) {
                    setActiveProfile(null);
                    setUsername("");
                    localStorage.removeItem("activeProfile");
                }
            } catch (err) {
                console.error('Poistossa virhe, päivitetään paikallisesti:', err.message);
                const updatedProfiles = profiles.filter(p => p.id !== profileId);
                setProfiles(updatedProfiles);
                localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
                if (activeProfile && String(activeProfile.id) === String(profileId)) {
                    setActiveProfile(null);
                    setUsername("");
                    localStorage.removeItem("activeProfile");
                }
            }
        })();
    } 



    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage("");

        if (!username.trim()) {
            setErrorMessage("Käyttäjätunnus on pakollinen.");
            return;
        }

        if (!password.trim()) {
            setErrorMessage("Salasana on pakollinen.");
            return;
        }

        // Varmista, että aktiivinen profiili on valittu ja sen käyttäjätunnus vastaa syötettyä
        if (!activeProfile) {
            setErrorMessage("Valitse profiili ennen kirjautumista.");
            return;
        }

        if (String(activeProfile.username).trim() !== username.trim()) {
            setErrorMessage("Käyttäjätunnus ei vastaa valittua profiilia.");
            return;
        }

        setLoading(true);

        try {
            // Mock-kirjautuminen — luodaan token ja tallennetaan käyttäjänimi localStorageen 
            const token = "mock-token-" + Math.random().toString(36).slice(2);
            const auth = { token, user: { username: username.trim() } };
            localStorage.setItem("auth", JSON.stringify(auth));
            // Älä muokkaa profiilin username-arvoa kirjautuessa. Varmistettiin aiemmin, että
            // syötetty käyttäjätunnus vastaa aktiivisen profiilin usernamea.
            if (activeProfile) {
                localStorage.setItem("activeProfile", activeProfile.id);
            }
            navigate("/frontpage", { replace: true });
        } catch (err) {
            if (err.name === "QuotaExceededError") {
                setErrorMessage("LocalStorage on täynnä. Tyhjennä selaimen dataa.");
            } else {
                setErrorMessage("Kirjautuminen epäonnistui teknisen virheen vuoksi.");
            }
        } finally {
            setLoading(false);
        }
    }



    return (
        <div className="login">
            <h2>Kirjaudu</h2>
            {/* Profiilivalikko */}
            <div>
                <h3>Profiilit</h3>
                
                {profiles.length > 0 && (
                    <div className="profile-select">
                        <select 
                            value={String(activeProfile?.id || "")}
                            onChange={(e) => {
                                const val = String(e.target.value);
                                const profile = profiles.find(p => String(p.id) === val);
                                if (profile) selectProfile(profile);
                            }}
                        >
                            <option value="">Valitse profiili...</option>
                            {profiles.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                </option>
                            ))}
                        </select>
                        
                        {activeProfile && (
                            <button 
                                onClick={() => deleteProfile(activeProfile.id)}
                            >
                                Poista profiili
                            </button>
                        )}
                    </div>
                )}

                {!showAddProfile ? (
                    <button 
                        onClick={() => setShowAddProfile(true)}
                    >
                        Lisää uusi profiili
                    </button>
                ) : (
                    <div>
                        <input
                            type="text"
                            placeholder="Profiilin nimi"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                        />
                        <div>
                            <button
                                onClick={() => addProfile(newProfileName)}
                            >
                                Lisää
                            </button>
                            <button className="cancel"
                                onClick={() => {
                                    setShowAddProfile(false);
                                    setNewProfileName("");
                                }}
                            >
                                Peruuta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        type="text"  // 🔹 nyt vapaamuotoinen, ei email 
                        placeholder="Käyttäjätunnus"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <input
                        type="password"
                        placeholder="Salasana"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {errorMessage && (
                    <p className="error">
                        {errorMessage}
                    </p>
                )}
                <button className="login-bt">
                    {loading ? "Kirjautuminen..." : "Kirjaudu"}
                </button>

            </form>
            <p>
                Syötä vapaamuotoinen käyttäjätunnus ja salasana.
            </p>
        </div>
    );
}

