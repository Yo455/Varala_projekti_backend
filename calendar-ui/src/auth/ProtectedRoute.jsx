import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, redirectTo = "/login" }) {
    const location = useLocation();
    // Tarkista localStoragesta suoraan
    const auth = localStorage.getItem("auth");
    let isAuth = false;
    if (auth) {
        try {
            const parsed = JSON.parse(auth);
            isAuth = Boolean(parsed.token);
        } catch (e) {
            console.error("Invalid auth in localStorage:", e);
            localStorage.removeItem("auth"); // poista viallinen
        }
    }
    console.log("ProtectedRoute: isAuth =", isAuth, "auth =", auth);

    if (!isAuth) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return children;
}