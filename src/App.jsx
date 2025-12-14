import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Home from "./pages/Home";
import CreateOrganization from "./pages/CreateOrganization";
import ChooseOrganization from "./pages/ChooseOrganization";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/choose-organization" element={<ChooseOrganization />} />
        <Route path="/create-organization" element={<CreateOrganization />} />
      
      </Routes>
    </BrowserRouter>
  );
}
