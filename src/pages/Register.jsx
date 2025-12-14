import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    if (!fullName || !email || !password) {
      alert("Aizpildi visus laukus!");
      return;
    }

    setLoading(true);

    // 1) SUPABASE AUTH
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
        },
      },
    });

    if (error) {
      alert("Kļūda auth reģistrācijā: " + error.message);
      setLoading(false);
      return;
    }

    // 2) IERAKSTS TEACHERS / STUDENTS TABULĀ
    if (role === "teacher") {
      const { error: tErr } = await supabase.from("teachers").insert({
        full_name: fullName,
        email: email.toLowerCase(),
        organization_id: null,
      });
      if (tErr) {
        alert("Kļūda saglabājot skolotāju: " + tErr.message);
        setLoading(false);
        return;
      }
      alert("Reģistrācija veiksmīga! Tgd izveido organizāciju.");
      navigate("/create-organization");
    } else {
      const { error: sErr } = await supabase.from("students").insert({
        full_name: fullName,
        email: email.toLowerCase(),
        organization_id: null,
      });
      if (sErr) {
        alert("Kļūda saglabājot studentu: " + sErr.message);
        setLoading(false);
        return;
      }
      alert("Reģistrācija veiksmīga! Tgd pievienojies organizācijai.");
      navigate("/choose-organization");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816]">
      <div className="relative w-full max-w-md bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          Reģistrācija
        </h1>

        {/* Role switch */}
        <div className="flex mb-6 bg-white/10 rounded-full p-1 border border-white/20">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
              role === "student"
                ? "bg-indigo-500 text-white shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Students
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
              role === "teacher"
                ? "bg-indigo-500 text-white shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            Skolotājs
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Pilnais vārds"
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="email"
            placeholder="E-pasts"
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Parole"
            className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50"
          >
            {loading ? "Reģistrē..." : "Reģistrēties"}
          </button>
        </form>

        <p className="text-center text-white/70 text-sm mt-4">
          Jau ir konts?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-indigo-300 hover:text-indigo-200 cursor-pointer underline"
          >
            Ielogoties
          </span>
        </p>
      </div>
    </div>
  );
}
