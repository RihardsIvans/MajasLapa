import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  UserIcon,
  UsersIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  ArrowUpTrayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

/* ===================== FAILU AUGŠUPIELĀDES KOMPONENTE ===================== */

function FileUpload({ task, studentId, existingSubmission, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) {
      alert("Izvēlies failu, ko iesniegt!");
      return;
    }

    try {
      setUploading(true);

      // Izveidojam unikālu faila ceļu
      const safeName = file.name.replace(/\s+/g, "_");
      const filePath = `${studentId}/${task.id}_${Date.now()}_${safeName}`;

      // 1) Augšupielāde uz Storage bucket "submissions"
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        alert("Neizdevās augšupielādēt failu.");
        setUploading(false);
        return;
      }

      // 2) Publiskais URL
      const { data: publicData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;

      // 3) Ieraksts submissions tabulā
      const { error: dbError } = await supabase.from("submissions").insert({
        task_id: task.id,
        student_id: studentId,
        file_url: publicUrl,
      });

      if (dbError) {
        console.error(dbError);
        alert("Neizdevās saglabāt iesniegumu datubāzē.");
        setUploading(false);
        return;
      }

      alert("Fails veiksmīgi iesniegts! 🎉");
      setUploading(false);
      setFile(null);
      onUploadComplete && onUploadComplete();
    } catch (err) {
      console.error(err);
      alert("Radās neparedzēta kļūda iesniedzot failu.");
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 p-3 bg-slate-900/60 border border-slate-700 rounded-xl">
      {existingSubmission ? (
        <div className="mb-3 text-sm text-emerald-300">
          ✅ Tu jau esi iesniedzis failu šim uzdevumam.
          <br />
          <a
            href={existingSubmission.file_url}
            target="_blank"
            rel="noreferrer"
            className="underline text-emerald-200 hover:text-emerald-100"
          >
            Atvērt iesniegto failu
          </a>
        </div>
      ) : (
        <p className="mb-2 text-sm text-slate-300 flex items-center gap-2">
          <ArrowUpTrayIcon className="w-4 h-4 text-indigo-300" />
          Iesniedz savu darbu (jebkāds faila formāts).
        </p>
      )}

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0] || null)}
        className="block w-full text-sm text-slate-200 mb-2"
      />

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 text-white text-sm rounded-lg shadow-md transition-all active:scale-95"
      >
        {uploading
          ? "Augšupielādēju..."
          : existingSubmission
          ? "Pārsūtīt jaunu failu"
          : "Iesniegt failu"}
      </button>
    </div>
  );
}

/* ===================== GALVENĀ STUDENT DASHBOARD LAPA ===================== */

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadEverything() {
      setLoading(true);
      setErrorMsg("");

      // 1) AUTH
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth?.user) {
        setErrorMsg("Neizdevās ielādēt lietotāju. Lūdzu, pieslēdzies no jauna.");
        setLoading(false);
        return;
      }
      const u = auth.user;
      setUser(u);

      // 2) STUDENTS (pēc e-pasta)
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("email", u.email)
        .maybeSingle();

      if (studentError || !studentData) {
        console.error(studentError);
        setErrorMsg("Šim e-pastam nav atrasts students datubāzē.");
        setLoading(false);
        return;
      }

      setStudent(studentData);

      // 3) ORGANIZATION
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", studentData.organization_id)
        .maybeSingle();

      setOrganization(orgData || null);

      // 4) TEACHER (pirmais organizācijas skolotājs)
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("*")
        .eq("organization_id", studentData.organization_id)
        .limit(1)
        .maybeSingle();

      setTeacher(teacherData || null);

      // 5) TASKS šai organizācijai (un vēlāk filtrēsim priekš studenta)
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", studentData.organization_id)
        .order("due_date", { ascending: true });

      if (tasksError) {
        console.error(tasksError);
        setErrorMsg("Neizdevās ielādēt uzdevumus.");
        setLoading(false);
        return;
      }

      const allTasks = tasksData || [];

      // Filtrē uzdevumus tikai šim studentam
      const myTasks = allTasks.filter((t) => {
        if (!t.target_type || t.target_type === "all") return true;
        if (t.target_type === "group" && t.target_group === studentData.group_name)
          return true;
        if (t.target_type === "student" && t.target_student === studentData.id)
          return true;
        return false;
      });

      setTasks(myTasks);

      // 6) CITI STUDENTI ORGANIZĀCIJĀ
      const { data: allStudents } = await supabase
        .from("students")
        .select("id, full_name, email, group_name")
        .eq("organization_id", studentData.organization_id)
        .order("full_name");

      const list = allStudents || [];
      setStudentsList(list);

      // Grupas - unikālas group_name vērtības
      const groupSet = new Set(
        list
          .map((s) => s.group_name)
          .filter((g) => g && g.trim().length > 0)
      );
      setGroups(Array.from(groupSet));

      // 7) IESNIEGTIE FAILI TIEŠI ŠIM STUDENTAM
      const { data: subsData, error: subsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", studentData.id);

      if (subsError) {
        console.error(subsError);
      }

      setSubmissions(subsData || []);

      setLoading(false);
    }

    loadEverything();
  }, []);

  // Palīgfunkcija – atrast iesniegumu konkrētam uzdevumam
  function getSubmissionForTask(taskId) {
    return submissions.find((s) => s.task_id === taskId) || null;
  }

  // Studenta grupas biedri
  const myGroupName = student?.group_name || null;
  const myGroupMembers = myGroupName
    ? studentsList.filter(
        (s) => s.group_name === myGroupName && s.id !== student.id
      )
    : [];

  // Termiņa statuss
  function getDueStatus(due) {
    if (!due) {
      return {
        text: "Nav termiņa",
        color: "text-gray-300",
        glow: "bg-gray-700/30",
      };
    }

    const now = new Date();
    const d = new Date(due);
    const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        text: "Nokavēts",
        color: "text-red-400",
        glow: "bg-red-500/20",
      };
    if (diffDays === 0)
      return {
        text: "Jāiesniedz šodien",
        color: "text-yellow-300",
        glow: "bg-yellow-500/20",
      };
    if (diffDays <= 3)
      return {
        text: `Palikušas ${diffDays} dienas`,
        color: "text-orange-300",
        glow: "bg-orange-500/20",
      };

    return {
      text: `Līdz ${d.toLocaleDateString("lv-LV")}`,
      color: "text-emerald-300",
      glow: "bg-emerald-500/20",
    };
  }

  /* ===================== LOADING ===================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loader"></div>

        <style>{`
          .loader {
            width: 55px;
            height: 55px;
            border: 4px solid rgba(255,255,255,0.2);
            border-top-color: #7c3aed;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  /* ===================== ERROR ===================== */

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-center px-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-md">
          <h1 className="text-3xl font-bold mb-4">Studenta panelis</h1>
          <p className="text-slate-300 mb-3">{errorMsg}</p>
          <p className="text-xs text-slate-500">
            Pārliecinies, ka <code>students</code> tabulā ir ieraksts ar tavu e-pastu.
          </p>
        </div>
      </div>
    );
  }

  /* ===================== GALVENĀ UI ===================== */

  return (
    <div className="relative min-h-screen bg-[#040012] text-white overflow-hidden">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-slate-900 to-blue-900/40" />
        <div className="absolute inset-0 opacity-30 animated-grid" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/30 blur-3xl rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-500/25 blur-3xl rounded-full animate-pulse delay-700" />
        <div className="absolute bottom-[-120px] right-[-90px] w-[420px] h-[420px] bg-pink-500/25 blur-[120px] rounded-full animate-pulse delay-1200" />
      </div>

      <style>{`
        .animated-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 44px 44px;
          animation: gridFlow 20s linear infinite;
        }
        @keyframes gridFlow {
          from { transform: translateY(0); }
          to { transform: translateY(-600px); }
        }
        .infoCard {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 18px;
          border-radius: 20px;
          backdrop-blur: 14px;
          box-shadow: 0 0 20px rgba(0,0,0,0.4);
          transition: 0.25s;
        }
        .infoCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 28px rgba(120,90,255,0.4);
        }
        .infoIcon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          margin-bottom: 10px;
          border-width: 1px;
        }
        .infoTitle {
          font-size: 13px;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 4px;
          letter-spacing: 0.1em;
        }
        .infoValue {
          font-size: 18px;
          font-weight: 700;
        }
        .infoDesc {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 2px;
        }
        .sectionTitle {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .taskCard {
          padding: 20px;
          background: rgba(15,20,50,0.55);
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-blur: 14px;
          box-shadow: 0 0 26px rgba(0,0,0,0.4);
          animation: fadeUp 0.9s ease both;
          transition: 0.25s;
        }
        .taskCard:hover {
          transform: translateY(-5px);
          box-shadow: 0 0 32px rgba(90,120,255,0.4);
        }
        .taskTitle {
          font-size: 18px;
          font-weight: 700;
        }
        .taskDesc {
          opacity: 0.7;
          font-size: 14px;
          margin-top: 6px;
          margin-bottom: 12px;
        }
        .taskBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .studentCard {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(255,255,255,0.05);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: 0.2s;
        }
        .studentCard:hover {
          transform: translateX(4px);
          box-shadow: 0 0 18px rgba(120,90,255,0.3);
        }
        .studentIcon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(120,90,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
        }
        .studentName {
          font-size: 14px;
          font-weight: bold;
        }
        .studentEmail {
          font-size: 12px;
          opacity: 0.7;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* HEADER */}
        <div className="mb-10 animate-fadeUp">
          <p className="text-sm text-slate-300/80">Sveiks,</p>
          <h1 className="text-4xl font-extrabold tracking-wide flex items-center gap-3">
            {student.full_name}
            <UserIcon className="w-8 h-8 text-indigo-300" />
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Organizācija:
            <span className="font-semibold text-indigo-300 ml-1">
              {organization?.name}
            </span>
            {myGroupName && (
              <>
                {" · "}Grupa:
                <span className="font-semibold text-emerald-300 ml-1">
                  {myGroupName}
                </span>
              </>
            )}
          </p>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Org card */}
          <div className="infoCard">
            <div className="infoIcon bg-indigo-600/60 border-indigo-500/50">
              <BuildingOffice2Icon className="w-6 h-6" />
            </div>
            <h3 className="infoTitle">Organizācija</h3>
            <p className="infoValue">{organization?.name || "Nav"}</p>
            <p className="infoDesc">
              {organization?.description || "Organizācijai nav apraksta."}
            </p>
          </div>

          {/* Teacher card */}
          <div className="infoCard">
            <div className="infoIcon bg-emerald-600/60 border-emerald-500/50">
              <AcademicCapIcon className="w-6 h-6" />
            </div>
            <h3 className="infoTitle">Tavs skolotājs</h3>
            <p className="infoValue">
              {teacher?.full_name || "Nav skolotāja ieraksta"}
            </p>
            <p className="infoDesc">{teacher?.email || ""}</p>
          </div>

          {/* Students & groups card */}
          <div className="infoCard">
            <div className="infoIcon bg-pink-600/60 border-pink-500/50">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h3 className="infoTitle">Skolēni un grupas</h3>
            <p className="infoValue">{studentsList.length} skolēni</p>
            <p className="infoDesc">
              Grupas:{" "}
              {groups.length === 0
                ? "nav norādītas grupas"
                : groups.join(", ")}
            </p>
          </div>
        </div>

        {/* TASKS SECTION */}
        <div className="mb-12">
          <h2 className="sectionTitle">Tavi uzdevumi</h2>

          {tasks.length === 0 ? (
            <p className="text-slate-400 mt-4">
              Pašlaik tev nav neviena uzdevuma. 🎉
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mt-5">
              {tasks.map((task, i) => {
                const status = getDueStatus(task.due_date);
                const submission = getSubmissionForTask(task.id);

                return (
                  <div
                    key={task.id}
                    className="taskCard"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <h3 className="taskTitle">{task.title}</h3>
                    <p className="taskDesc">
                      {task.description || "Nav uzdevuma apraksta."}
                    </p>

                    <span
                      className={`taskBadge ${status.color} ${status.glow}`}
                    >
                      <ClockIcon className="w-4 h-4" />
                      {status.text}
                    </span>

                    <FileUpload
                      task={task}
                      studentId={student.id}
                      existingSubmission={submission}
                      onUploadComplete={async () => {
                        // Pārlādē submissions pēc iesniegšanas
                        const { data: subsData } = await supabase
                          .from("submissions")
                          .select("*")
                          .eq("student_id", student.id);
                        setSubmissions(subsData || []);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GROUP SECTION – mana grupa */}
        {myGroupName && (
          <div className="mb-10">
            <h2 className="sectionTitle">Tava grupa: {myGroupName}</h2>
            {myGroupMembers.length === 0 ? (
              <p className="text-slate-400 text-sm">
                Šobrīd šajā grupā citu skolēnu nav (vai tie nav norādīti).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {myGroupMembers.map((s) => (
                  <div key={s.id} className="studentCard">
                    <div className="studentIcon">
                      {s.full_name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <p className="studentName">{s.full_name}</p>
                      <p className="studentEmail">{s.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALL STUDENTS SECTION */}
        <div>
          <h2 className="sectionTitle">Visi skolēni organizācijā</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {studentsList.map((s) => (
              <div key={s.id} className="studentCard">
                <div className="studentIcon">
                  {s.full_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div>
                  <p className="studentName">
                    {s.full_name}
                    {s.group_name && (
                      <span className="ml-2 text-xs text-indigo-300">
                        ({s.group_name})
                      </span>
                    )}
                  </p>
                  <p className="studentEmail">{s.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
