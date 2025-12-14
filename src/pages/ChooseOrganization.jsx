import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function ChooseOrganization() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [orgTeachers, setOrgTeachers] = useState({}); // { orgId: [teachers] }
  const [orgStudentsCount, setOrgStudentsCount] = useState({}); // { orgId: count }
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningOrgId, setJoiningOrgId] = useState(null);

  // Ielādējam user + organizācijas + skolotājus + studentu skaitu
  useEffect(() => {
    async function loadData() {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;
      setUser(u);

      if (!u) {
        navigate("/login");
        return;
      }

      // Organizācijas
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });

      if (orgError) {
        console.error("ORG ERROR:", orgError);
        setLoading(false);
        return;
      }

      const orgList = orgData || [];
      setOrgs(orgList);

      if (orgList.length === 0) {
        setLoading(false);
        return;
      }

      const orgIds = orgList.map((o) => o.id);

      // Skolotāji priekš katras org
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("id, full_name, email, organization_id")
        .in("organization_id", orgIds);

      const teacherMap = {};
      (teacherData || []).forEach((t) => {
        if (!teacherMap[t.organization_id]) teacherMap[t.organization_id] = [];
        teacherMap[t.organization_id].push(t);
      });
      setOrgTeachers(teacherMap);

      // Skolēnu skaits priekš katras org
      const { data: studentData } = await supabase
        .from("students")
        .select("id, organization_id")
        .in("organization_id", orgIds);

      const countMap = {};
      (studentData || []).forEach((s) => {
        if (!countMap[s.organization_id]) countMap[s.organization_id] = 0;
        countMap[s.organization_id] += 1;
      });
      setOrgStudentsCount(countMap);

      setLoading(false);
    }

    loadData();
  }, []);

  // Students pievienojas organizācijai
  async function joinOrganization(orgId) {
    if (!user) return;
    setJoiningOrgId(orgId);

    // Drošā versija – pēc e-pasta:
    const { error } = await supabase
      .from("students")
      .update({ organization_id: orgId })
      .eq("email", user.email);

    if (error) {
      alert("Neizdevās pievienoties organizācijai: " + error.message);
      setJoiningOrgId(null);
      return;
    }

    // Uzreiz uz studentu paneli
    navigate("/student");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050012] overflow-hidden">

      {/* ======= KOSMISKAIS FONS ======= */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient slānis */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-slate-900 to-blue-900/40" />
        {/* Grid līnijas */}
        <div className="absolute inset-0 opacity-30 animated-grid" />
        {/* Orbi */}
        <div className="absolute -top-36 -left-32 w-80 h-80 bg-purple-500/40 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-[-120px] right-[-80px] w-96 h-96 bg-pink-500/35 blur-3xl rounded-full animate-pulse delay-1000" />
        <div className="absolute top-1/3 left-2/3 w-64 h-64 bg-sky-500/35 blur-3xl rounded-full animate-pulse delay-2000" />
      </div>

      {/* Papildu efektu stils */}
      <style>{`
        .animated-grid {
          background-image:
            linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px);
          background-size: 42px 42px;
          animation: gridMove 26s linear infinite;
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to { transform: translateY(-500px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.8s ease-out;
        }
        .loader {
          width: 50px;
          height: 50px;
          border-radius: 999px;
          border: 4px solid rgba(148,163,184,0.4);
          border-top-color: #6366f1;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ======= GALVENĀ KARTA ======= */}
      <div className="relative z-10 w-[900px] max-w-[94vw] bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.7)] px-10 py-9 animate-fadeUp">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80 mb-2">
              Student workspace
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
              Izvēlies savu organizāciju
              <AcademicCapIcon className="w-7 h-7 text-indigo-300" />
            </h1>
            <p className="text-slate-300 mt-3 max-w-xl text-sm">
              Šeit tu redzēsi visas skolas / klases organizācijas, pievienosies atbilstošajai
              un pēc tam varēsi skatīt uzdevumus, skolotājus un citus skolēnus.
            </p>
          </div>

          {user && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3 text-sm shadow-lg min-w-[220px]">
              <p className="text-slate-300">Pieslēdzies kā:</p>
              <p className="font-semibold text-indigo-200 break-all">
                {user.email}
              </p>
            </div>
          )}
        </div>

        {/* Saturs */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="loader" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-sm mb-2">
              Pašlaik nav nevienas izveidotas organizācijas.
            </p>
            <p className="text-xs text-slate-500">
              Lūdz skolotājam vispirms izveidot organizāciju skolotāju panelī.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orgs.map((org, index) => {
              const teachers = orgTeachers[org.id] || [];
              const mainTeacher = teachers[0];
              const extraCount = Math.max(0, teachers.length - 1);

              const studentCount = orgStudentsCount[org.id] || 0;

              const isJoining = joiningOrgId === org.id;

              return (
                <div
                  key={org.id}
                  className="group relative bg-white/8 border border-white/12 rounded-2xl p-6 shadow-lg hover:shadow-indigo-500/35 transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => !isJoining && joinOrganization(org.id)}
                >
                  {/* Glow slānis */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Mazas gaismiņas */}
                  <div className="absolute -top-2 right-4 flex gap-1 opacity-80">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse delay-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse delay-700" />
                  </div>

                  <div className="relative z-10">
                    {/* Org nosaukums */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-500/80 flex items-center justify-center shadow-md">
                        <BuildingOffice2Icon className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-white drop-shadow-sm">
                        {org.name}
                      </h2>
                    </div>

                    {/* Apraksts */}
                    <p className="text-sm text-slate-200/90 mb-3">
                      {org.description || "Organizācijai vēl nav detalizēta apraksta."}
                    </p>

                    {/* Info rinda: skolotājs + skolēni */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-4">
                      {/* Skolotājs */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-slate-600 flex items-center justify-center text-[10px] font-semibold text-indigo-200">
                          {mainTeacher
                            ? (mainTeacher.full_name || "?").charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                            Skolotājs
                          </span>
                          <span className="text-[12px] text-slate-100">
                            {mainTeacher
                              ? mainTeacher.full_name
                              : "Nav skolotāja ieraksta"}
                            {extraCount > 0 && (
                              <span className="text-slate-400"> +{extraCount}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Skolēnu skaits */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-slate-600 flex items-center justify-center">
                          <UsersIcon className="w-4 h-4 text-sky-300" />
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                            Skolēni
                          </span>
                          <span className="text-[12px] text-slate-100">
                            {studentCount} skolēni
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Poga */}
                    <button
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700 hover:gap-3 active:scale-95 transition-all"
                      disabled={isJoining}
                    >
                      {isJoining ? (
                        <>
                          Pievienojos...
                          <span className="w-3 h-3 rounded-full bg-white/70 animate-ping" />
                        </>
                      ) : (
                        <>
                          Pievienoties
                          <ArrowRightIcon className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ja students jau pievienojas */}
        {joiningOrgId && (
          <p className="text-center text-indigo-300 mt-6 text-sm animate-pulse">
            Pievienojos izvēlētajai organizācijai...
          </p>
        )}
      </div>
    </div>
  );
}
