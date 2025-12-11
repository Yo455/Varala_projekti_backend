import React from "react";
import { Navigate, useLocation } from "react-router-dom";

//exportatuna komponenttina, joka suojaa reittejä tarkistamalla käyttäjän autentikoinnin localStoragesta
export default function ProtectedRoute({ children, redirectTo = "/login" }) {
    const location = useLocation(); // hae nykyinen sijainti reititystä varten
    const auth = localStorage.getItem("auth"); // hae autentikointitiedot localStoragesta
    let isAuth = false; // oletuksena ei ole autentikoitu
    if (auth) {
        try {
            const parsed = JSON.parse(auth); // jäsennä JSON-muotoinen auth-objekti
            isAuth = Boolean(parsed.token); // tarkista, onko token olemassa
        } catch (e) {
            console.error("Invalid auth in localStorage:", e);
            localStorage.removeItem("auth"); // poista viallinen
        }
    }
    console.log("ProtectedRoute: isAuth =", isAuth, "auth =", auth);

    if (!isAuth) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />; // jos ei ole autentikoitu, uudelleenohjaa kirjautumissivulle
    }
    return children;
}