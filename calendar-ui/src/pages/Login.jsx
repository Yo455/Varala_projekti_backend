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



        setLoading(true);

        try {

            // Mock-kirjautuminen — luodaan token ja tallennetaan käyttäjänimi localStorageen 

            const token = "mock-token-" + Math.random().toString(36).slice(2);

            const auth = { token, user: { username: username.trim() } };

            localStorage.setItem("auth", JSON.stringify(auth));

            // Päivitä aktiivinen profiili jos se löytyy
            if (activeProfile) {
                const updatedProfile = { ...activeProfile, username: username.trim() };
                const updatedProfiles = profiles.map(p => 
                    p.id === activeProfile.id ? updatedProfile : p
                );
                setProfiles(updatedProfiles);
                localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
                localStorage.setItem("activeProfile", activeProfile.id);
            }

            navigate("/calendar", { replace: true });

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

        <div style={{ padding: 20, maxWidth: 480 }}>

            <h2>Kirjaudu</h2>

            {/* Profiilivalikko */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 10 }}>Profiilit</h3>
                
                {profiles.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <select 
                            value={String(activeProfile?.id || "")}
                            onChange={(e) => {
                                const val = String(e.target.value);
                                const profile = profiles.find(p => String(p.id) === val);
                                if (profile) selectProfile(profile);
                            }}
                            style={{ width: "100%", padding: 8, marginBottom: 8 }}
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
                                style={{ 
                                    padding: "4px 8px", 
                                    backgroundColor: "#dc3545", 
                                    color: "white", 
                                    border: "none", 
                                    borderRadius: 4,
                                    cursor: "pointer"
                                }}
                            >
                                Poista profiili
                            </button>
                        )}
                    </div>
                )}

                {!showAddProfile ? (
                    <button 
                        onClick={() => setShowAddProfile(true)}
                        style={{ 
                            padding: "8px 16px", 
                            backgroundColor: "#28a745", 
                            color: "white", 
                            border: "none", 
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        Lisää uusi profiili
                    </button>
                ) : (
                    <div style={{ marginBottom: 10 }}>
                        <input
                            type="text"
                            placeholder="Profiilin nimi"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            style={{ width: "100%", padding: 8, marginBottom: 8 }}
                        />
                        <div>
                            <button 
                                onClick={() => addProfile(newProfileName)}
                                style={{ 
                                    padding: "4px 8px", 
                                    backgroundColor: "#28a745", 
                                    color: "white", 
                                    border: "none", 
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    marginRight: 8
                                }}
                            >
                                Lisää
                            </button>
                            <button 
                                onClick={() => {
                                    setShowAddProfile(false);
                                    setNewProfileName("");
                                }}
                                style={{ 
                                    padding: "4px 8px", 
                                    backgroundColor: "#6c757d", 
                                    color: "white", 
                                    border: "none", 
                                    borderRadius: 4,
                                    cursor: "pointer"
                                }}
                            >
                                Peruuta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>

                <div style={{ marginBottom: 8 }}>

                    <input

                        type="text"  // 🔹 nyt vapaamuotoinen, ei email 

                        placeholder="Käyttäjätunnus"

                        value={username}

                        onChange={(e) => setUsername(e.target.value)}

                        required

                        style={{ width: "100%", padding: 8 }}

                    />

                </div>

                <div style={{ marginBottom: 12 }}>

                    <input

                        type="password"

                        placeholder="Salasana"

                        value={password}

                        onChange={(e) => setPassword(e.target.value)}

                        required

                        style={{ width: "100%", padding: 8 }}

                    />

                </div>

                {errorMessage && (

                    <p style={{ color: "red", marginBottom: 12, fontSize: 14 }}>

                        {errorMessage}

                    </p>

                )}

                <button type="submit" disabled={loading} style={{ padding: "8px 16px", marginRight: 8 }}>

                    {loading ? "Kirjautuminen..." : "Kirjaudu"}

                </button>

            </form>

            <p style={{ marginTop: 12, fontSize: 13, color: "#666" }}>

                Syötä vapaamuotoinen käyttäjätunnus ja salasana.

            </p>

        </div>

    );

}

