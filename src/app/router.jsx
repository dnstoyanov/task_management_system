import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/Login";
import Register from "../pages/Register";
import DashboardPage from "../pages/DashboardPage";
import ProjectPage from "../pages/ProjectPage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/register" element={<Register/>} />
      <Route path="/" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>} />
      <Route path="/p/:projectId" element={<ProtectedRoute><ProjectPage/></ProtectedRoute>} />
    </Routes>
  );
}
