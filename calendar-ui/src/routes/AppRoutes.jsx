import { Routes, Route, Navigate } from "react-router-dom";
import Calendar from "../pages/Calendar";
import Login from "../pages/Login";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}