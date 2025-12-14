import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center text-white">

      {/* Kosmiskais violets fons */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-700/40 via-indigo-700/30 to-transparent blur-3xl animate-pulse-slow"></div>

      {/* Zils fons */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-blue-800/40 via-indigo-600/30 to-transparent blur-2xl animate-pulse-slower"></div>

      {/* Galvenais teksts */}
      <h1 className="text-6xl font-extrabold tracking-wide drop-shadow-2xl mb-4 text-center z-10">
        Studentu un Skolotāju Sistēma
      </h1>

      <p className="text-xl text-gray-300 max-w-2xl text-center mb-10 z-10">
        Moderns risinājums uzdevumu pārvaldībai, studentu sistēmām un skolu organizācijām.  
        Izstrādāts ar <span className="text-blue-400 font-bold">React + Tailwind + Supabase</span>.
      </p>

      {/* Pogas ar animāciju */}
      <div className="flex gap-6 mt-4 z-10">

        {/* LOGIN poga */}
        <button
          onClick={() => navigate("/login")}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 
                     text-white text-lg font-semibold shadow-xl
                     hover:scale-110 hover:shadow-blue-500/50 hover:from-blue-500 hover:to-blue-600
                     transition-all duration-300 active:scale-95"
        >
          Ielogoties
        </button>

        {/* REGISTER poga */}
        <button
          onClick={() => navigate("/register")}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700
                     text-white text-lg font-semibold shadow-xl
                     hover:scale-110 hover:shadow-purple-500/50 hover:from-purple-500 hover:to-purple-600
                     transition-all duration-300 active:scale-95"
        >
          Reģistrēties
        </button>

      </div>

      {/* Footer teksts */}
      <div className="absolute bottom-10 text-gray-400 text-sm opacity-80 select-none">
        Izstrādāja: Rihards • 2025 • Prakses projekts
      </div>

    </div>
  );
}
