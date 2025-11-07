import React, { useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";



export default function Login() {

    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("testuser"); // vapaamuotoinen käyttäjänimi 
    const [password, setPassword] = useState("test"); // valmiiksi täytetty 
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const API = "http://localhost:3001"; // backendin osoite 



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

