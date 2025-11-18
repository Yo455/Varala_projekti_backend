import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import FrontPage from "../pages/FrontPage";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/frontpage" element={<FrontPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}