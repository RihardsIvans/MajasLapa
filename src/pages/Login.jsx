import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Kļūda ielogojoties: " + error.message);
      setLoading(false);
      return;
    }

    // Nolasa user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      alert("Neizdevās nolasīt lietotāja datus.");
      setLoading(false);
      return;
    }

    const role = user.user_metadata?.role;
    const userEmail = user.email?.toLowerCase();

    if (role === "teacher") {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (!teacher) {
        alert("Šis skolotājs nav atrasts teachers tabulā.");
        setLoading(false);
        return;
      }

      if (!teacher.organization_id) {
        navigate("/create-organization");
      } else {
        navigate("/teacher");
      }
    } else if (role === "student") {
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (!student) {
        alert("Šis students nav atrasts students tabulā.");
        setLoading(false);
        return;
      }

      if (!student.organization_id) {
        navigate("/choose-organization");
      } else {
        navigate("/student");
      }
    } else {
      alert("Lietotājam nav uzstādīta loma (role).");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050816]">
      <div className="w-full max-w-md bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          Pieslēgties
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? "Ielādē..." : "Ielogoties"}
          </button>
        </form>

        <p className="text-center text-white/70 text-sm mt-4">
          Vēl nav konta?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-indigo-300 hover:text-indigo-200 cursor-pointer underline"
          >
            Reģistrēties
          </span>
        </p>
      </div>
    </div>
  );
}
