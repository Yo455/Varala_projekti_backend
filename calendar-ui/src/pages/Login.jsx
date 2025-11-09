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

    // Lataa profiilit localStoragesta
    useEffect(() => {
        const savedProfiles = localStorage.getItem("profiles");
        const savedActiveProfile = localStorage.getItem("activeProfile");
        
        if (savedProfiles) {
            try {
                const parsedProfiles = JSON.parse(savedProfiles);
                setProfiles(parsedProfiles);
                
                if (savedActiveProfile) {
                    const active = parsedProfiles.find(p => p.id === savedActiveProfile);
                    if (active) {
                        setActiveProfile(active);
                        setUsername(active.username);
                    }
                }
            } catch (e) {
                console.error("Virhe profiilien lataamisessa:", e);
            }
        }
    }, []);

    // Profiilin lisääminen
    function addProfile(name) {
        if (!name.trim()) return;
        
        const newProfile = {
            id: Date.now().toString(),
            name: name.trim(),
            username: name.trim(),
            createdAt: new Date().toISOString()
        };
        
        const updatedProfiles = [...profiles, newProfile];
        setProfiles(updatedProfiles);
        localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
        setNewProfileName("");
        setShowAddProfile(false);
    }

    // Profiilin valitseminen
    function selectProfile(profile) {
        setActiveProfile(profile);
        setUsername(profile.username);
        localStorage.setItem("activeProfile", profile.id);
    }

    // Profiilin poistaminen
    function deleteProfile(profileId) {
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        setProfiles(updatedProfiles);
        localStorage.setItem("profiles", JSON.stringify(updatedProfiles));
        
        if (activeProfile && activeProfile.id === profileId) {
            setActiveProfile(null);
            setUsername("");
            localStorage.removeItem("activeProfile");
        }
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
                            value={activeProfile?.id || ""}
                            onChange={(e) => {
                                const profile = profiles.find(p => p.id === e.target.value);
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

