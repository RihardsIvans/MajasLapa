import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function CreateOrganization() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacher() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      if (user.user_metadata?.role !== "teacher") {
        alert("Tikai skolotājs var izveidot organizāciju.");
        navigate("/");
        return;
      }

      const { data: teacherData } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (!teacherData) {
        alert("Skolotājs nav atrasts teachers tabulā.");
        navigate("/register");
        return;
      }

      setTeacher(teacherData);
      setLoading(false);
    }

    loadTeacher();
  }, [navigate]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name) {
      alert("Ievadi organizācijas nosaukumu!");
      return;
    }

    // Izveido jaunu organizāciju
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name,
        description,
      })
      .select()
      .single();

    if (orgErr) {
      alert("Kļūda veidojot organizāciju: " + orgErr.message);
      return;
    }

    // Piesaista organizāciju skolotājam
    const { error: tErr } = await supabase
      .from("teachers")
      .update({ organization_id: org.id })
      .eq("id", teacher.id);

    if (tErr) {
      alert("Kļūda atjaunojot skolotāju: " + tErr.message);
      return;
    }

    alert("Organizācija izveidota!");
    navigate("/teacher");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Ielādē skolotāja datus...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <form
        onSubmit={handleCreate}
        className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-xl"
      >
        <h1 className="text-2xl font-bold mb-4">Izveidot organizāciju</h1>
        <p className="text-slate-300 mb-4">
          Skolotājs: <b>{teacher.full_name}</b>
        </p>

        <input
          type="text"
          placeholder="Organizācijas nosaukums"
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          placeholder="Apraksts (nav obligāts)"
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-white mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
          Saglabāt
        </button>
      </form>
    </div>
  );
}
