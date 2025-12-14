import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [organization, setOrganization] = useState(null);

  const [activeTab, setActiveTab] = useState("tasks"); // tasks | students | groups | submissions

  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [error, setError] = useState("");

  // Uzdevuma formas stāvoklis
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskTargetType, setTaskTargetType] = useState("all"); // all | group
  const [taskTargetGroupName, setTaskTargetGroupName] = useState("");

  // Grupas formas stāvoklis
  const [newGroupName, setNewGroupName] = useState("");

  // Skolēna grupas maiņa
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedGroupForStudent, setSelectedGroupForStudent] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    // 1) Auth lietotājs
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log("AUTH RAW:", authData, authError);

    if (authError || !authData.user) {
      setError("Neizdevās ielādēt lietotāja datus.");
      setLoading(false);
      return;
    }

    const user = authData.user;

    // 2) Meklējam skolotāju pēc e-pasta
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("*")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    console.log("TEACHER DATA:", teacherData, teacherError);

    if (teacherError || !teacherData) {
      setError(
        "Šim lietotājam nav atrasts skolotāja ieraksts. Pārliecinies, ka teachers tabulā ir ieraksts ar šo e-pastu."
      );
      setLoading(false);
      return;
    }

    setTeacher(teacherData);

    // 3) Organizācijas info
    if (teacherData.organization_id) {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", teacherData.organization_id)
        .maybeSingle();

      console.log("ORG DATA:", org, orgError);
      if (!orgError) setOrganization(org);
    }

    // 4) Ielādējam grupas, skolēnus, uzdevumus, iesniegumus
    await Promise.all([
      loadGroups(teacherData.organization_id),
      loadStudents(teacherData.organization_id),
      loadTasks(teacherData),
      loadSubmissions(teacherData),
    ]);

    setLoading(false);
  }

  async function loadGroups(orgId) {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });

    console.log("GROUPS:", data, error);
    if (!error) setGroups(data || []);
  }

  async function loadStudents(orgId) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("organization_id", orgId)
      .order("full_name", { ascending: true });

    console.log("STUDENTS:", data, error);
    if (!error) setStudents(data || []);
  }

  async function loadTasks(teacherData) {
    if (!teacherData?.organization_id) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", teacherData.organization_id)
      .order("due_date", { ascending: true });

    console.log("TASKS:", data, error);
    if (!error) setTasks(data || []);
  }

  async function loadSubmissions(teacherData) {
    if (!teacherData?.organization_id) return;

    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        id,
        file_url,
        uploaded_at,
        student_id,
        task_id,
        students ( full_name, email, group_name ),
        tasks ( title, due_date, organization_id )
      `
      )
      .eq("tasks.organization_id", teacherData.organization_id)
      .order("uploaded_at", { ascending: false });

    console.log("SUBMISSIONS:", data, error);
    if (!error) setSubmissions(data || []);
  }

  /* ===================== UZDEVUMA IZVEIDE ===================== */

  async function handleCreateTask(e) {
    e.preventDefault();
    setError("");

    if (!taskTitle.trim()) {
      alert("Ievadi uzdevuma nosaukumu!");
      return;
    }
    if (!teacher?.organization_id) {
      alert("Šim skolotājam nav piesaistīta organizācija.");
      return;
    }

    let targetGroupValue = null;
    if (taskTargetType === "group") {
      if (!taskTargetGroupName) {
        alert("Izvēlies grupu, kurai uzdot uzdevumu.");
        return;
      }
      targetGroupValue = taskTargetGroupName;
    }

    const insertObj = {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      organization_id: teacher.organization_id,
      teacher_id: teacher.id,
      target_type: taskTargetType, // "all" vai "group"
      target_group: targetGroupValue,
      due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
    };

    const { error } = await supabase.from("tasks").insert([insertObj]);

    if (error) {
      console.error("CREATE TASK ERROR:", error);
      alert("Kļūda saglabājot uzdevumu: " + error.message);
      return;
    }

    // Notīrām formu un ielādējam sarakstu
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskTargetType("all");
    setTaskTargetGroupName("");

    await loadTasks(teacher);
  }

  /* ===================== GRUPAS IZVEIDE ===================== */

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("Ievadi grupas nosaukumu!");
      return;
    }
    if (!teacher?.organization_id) {
      alert("Nav atrasta organizācija.");
      return;
    }

    const { error } = await supabase.from("groups").insert([
      {
        name: newGroupName.trim(),
        organization_id: teacher.organization_id,
      },
    ]);

    if (error) {
      console.error("CREATE GROUP ERROR:", error);
      alert("Kļūda veidojot grupu: " + error.message);
      return;
    }

    setNewGroupName("");
    await loadGroups(teacher.organization_id);
  }

  /* ===================== SKOLĒNA GRUPAS MAIŅA ===================== */

  async function handleAssignStudentToGroup(e) {
    e.preventDefault();
    if (!selectedStudentId || !selectedGroupForStudent) {
      alert("Izvēlies gan skolēnu, gan grupu.");
      return;
    }

    const group = groups.find((g) => g.id === selectedGroupForStudent);
    if (!group) {
      alert("Grupa nav atrasta.");
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ group_name: group.name })
      .eq("id", selectedStudentId);

    if (error) {
      console.error("ASSIGN GROUP ERROR:", error);
      alert("Kļūda mainot skolēna grupu: " + error.message);
      return;
    }

    setSelectedStudentId("");
    setSelectedGroupForStudent("");
    await loadStudents(teacher.organization_id);
  }

  /* ===================== PALĪGFUNKCIJAS ===================== */

  function formatDate(d) {
    if (!d) return "Nav";
    try {
      return new Date(d).toLocaleString("lv-LV");
    } catch {
      return d;
    }
  }

  function getDueText(t) {
    if (!t?.due_date) return "Termiņš nav norādīts";
    const now = new Date();
    const due = new Date(t.due_date);
    const diffDays = Math.round(
      (due.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return "Nokavēts";
    if (diffDays === 0) return "Jāiesniedz šodien";
    if (diffDays <= 3) return `Palikušas ${diffDays} dienas`;
    return new Date(t.due_date).toLocaleDateString("lv-LV");
  }

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="loader-spin" />
          <p className="text-slate-300">Ielādēju skolotāja paneli...</p>

          <style>{`
            .loader-spin {
              width: 52px;
              height: 52px;
              border-radius: 999px;
              border: 4px solid rgba(148,163,184,0.4);
              border-top-color: rgb(129,140,248);
              animation: spin 0.7s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
          <h1 className="text-3xl font-bold mb-4">Skolotāja panelis</h1>
          <p className="text-slate-300 mb-4">{error}</p>
          <p className="text-xs text-slate-500">
            Pārliecinies, ka Supabase <code>teachers</code> un{" "}
            <code>organizations</code> tabulās ir pareizie dati.
          </p>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => {
    if (!t.due_date) return true;
    return new Date(t.due_date) >= new Date();
  });

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Fona animācijas */}
      <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.35),transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none bg-grid" />

      <style>{`
        .bg-grid {
          background-image:
            linear-gradient(to right, rgba(148,163,184,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px);
          background-size: 42px 42px;
          animation: gridMove 40s linear infinite;
        }
        @keyframes gridMove {
          from { transform: translateY(0px); }
          to   { transform: translateY(-200px); }
        }

        .card {
          background: rgba(15,23,42,0.88);
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.25);
          box-shadow: 0 18px 40px rgba(15,23,42,0.8);
          backdrop-filter: blur(14px);
        }
        .card-soft {
          background: rgba(15,23,42,0.82);
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow: 0 14px 30px rgba(15,23,42,0.75);
          backdrop-filter: blur(12px);
        }
        .tab-btn {
          position: relative;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          border: 1px solid transparent;
          transition: all .18s ease-out;
        }
        .tab-btn-active {
          background: linear-gradient(135deg, rgb(129,140,248), rgb(96,165,250));
          box-shadow: 0 12px 32px rgba(59,130,246,0.55);
          border-color: rgba(191,219,254,0.5);
        }
        .tab-btn-inactive {
          color: rgba(148,163,184,0.9);
          border-color: rgba(148,163,184,0.25);
          background: rgba(15,23,42,0.85);
        }
        .tab-btn-inactive:hover {
          border-color: rgba(191,219,254,0.6);
          color: rgba(226,232,240,1);
          transform: translateY(-1px);
        }
        .fade-in-up {
          animation: fadeInUp .3s ease-out forwards;
          opacity: 0;
          transform: translateY(8px);
        }
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-6 md:py-10">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 fade-in-up">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">
              Skolotāja panelis
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Sveiki,{" "}
              <span className="text-indigo-300">
                {teacher?.full_name || "Skolotāj"}
              </span>
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl">
              Pārvaldi uzdevumus, skolēnus, grupas un redzi iesniegtos darbus
              savā organizācijā vienā ērtā panelī.
            </p>
          </div>

          <div className="card-soft px-5 py-4 w-full md:w-auto">
            <p className="text-xs text-slate-400 mb-1">Organizācija</p>
            <p className="font-semibold">
              {organization?.name || "Nav norādīta"}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Aktīvie uzdevumi:{" "}
              <span className="text-emerald-300 font-semibold">
                {activeTasks.length}
              </span>{" "}
              · Nokavētie:{" "}
              <span className="text-rose-300 font-semibold">
                {overdueTasks.length}
              </span>
            </p>
          </div>
        </header>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-6 fade-in-up">
          {[
            { id: "tasks", label: "Uzdevumi" },
            { id: "students", label: "Skolēni" },
            { id: "groups", label: "Grupas" },
            { id: "submissions", label: "Iesniegtie darbi" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "tab-btn",
                activeTab === tab.id ? "tab-btn-active" : "tab-btn-inactive",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB SATURS */}
        {activeTab === "tasks" && (
          <TasksTab
            tasks={tasks}
            groups={groups}
            taskTitle={taskTitle}
            taskDescription={taskDescription}
            taskDueDate={taskDueDate}
            taskTargetType={taskTargetType}
            taskTargetGroupName={taskTargetGroupName}
            setTaskTitle={setTaskTitle}
            setTaskDescription={setTaskDescription}
            setTaskDueDate={setTaskDueDate}
            setTaskTargetType={setTaskTargetType}
            setTaskTargetGroupName={setTaskTargetGroupName}
            handleCreateTask={handleCreateTask}
            getDueText={getDueText}
          />
        )}

        {activeTab === "students" && (
          <StudentsTab
            students={students}
            groups={groups}
            selectedStudentId={selectedStudentId}
            selectedGroupForStudent={selectedGroupForStudent}
            setSelectedStudentId={setSelectedStudentId}
            setSelectedGroupForStudent={setSelectedGroupForStudent}
            handleAssignStudentToGroup={handleAssignStudentToGroup}
          />
        )}

        {activeTab === "groups" && (
          <GroupsTab
            groups={groups}
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            handleCreateGroup={handleCreateGroup}
            students={students}
          />
        )}

        {activeTab === "submissions" && (
          <SubmissionsTab submissions={submissions} formatDate={formatDate} />
        )}
      </div>
    </div>
  );
}

/* ===================== ATSEVIŠĶI TAB KOMPONENTI ===================== */

function TasksTab(props) {
  const {
    tasks,
    groups,
    taskTitle,
    taskDescription,
    taskDueDate,
    taskTargetType,
    taskTargetGroupName,
    setTaskTitle,
    setTaskDescription,
    setTaskDueDate,
    setTaskTargetType,
    setTaskTargetGroupName,
    handleCreateTask,
    getDueText,
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 fade-in-up">
      {/* Uzdevuma forma */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Izveidot jaunu uzdevumu</h2>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Uzdevuma nosaukums
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Piemēram, Uzprogrammēt kalkulatoru"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Apraksts
            </label>
            <textarea
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              placeholder="Papildus norādes, pievienojamā informācija..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Termiņš (pēc izvēles)
              </label>
              <input
                type="date"
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Kam uzdevums paredzēts?
              </label>
              <select
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={taskTargetType}
                onChange={(e) => setTaskTargetType(e.target.value)}
              >
                <option value="all">Visiem organizācijas skolēniem</option>
                <option value="group">Konkrētai grupai</option>
              </select>
            </div>
          </div>

          {taskTargetType === "group" && (
            <div className="fade-in-up">
              <label className="block text-sm text-slate-300 mb-1">
                Kura grupa?
              </label>
              <select
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={taskTargetGroupName}
                onChange={(e) => setTaskTargetGroupName(e.target.value)}
              >
                <option value="">-- Izvēlies grupu --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              {groups.length === 0 && (
                <p className="text-xs text-amber-300 mt-1">
                  Šobrīd nav nevienas grupas. Vispirms izveido grupas sadaļā.
                </p>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-[1px]"
            >
              Saglabāt uzdevumu
            </button>
          </div>
        </form>
      </div>

      {/* Uzdevumu saraksts */}
      <div className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Esošie uzdevumi</h2>
        {tasks.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Šobrīd nav neviena uzdevuma. Izveido pirmo pa kreisi.
          </p>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {tasks.map((t, idx) => (
              <div
                key={t.id}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm hover:border-indigo-400/70 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                      {t.description || "Apraksts nav norādīts."}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p
                      className={
                        "px-2 py-1 rounded-full inline-block mb-1 " +
                        (t.target_type === "all"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                          : "bg-sky-500/10 text-sky-300 border border-sky-500/40")
                      }
                    >
                      {t.target_type === "all"
                        ? "Visi skolēni"
                        : `Grupa: ${t.target_group || "?"}`}
                    </p>
                    <p className="text-slate-400">
                      {getDueText(t)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentsTab(props) {
  const {
    students,
    groups,
    selectedStudentId,
    selectedGroupForStudent,
    setSelectedStudentId,
    setSelectedGroupForStudent,
    handleAssignStudentToGroup,
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 fade-in-up">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-3">Skolēnu saraksts</h2>
        {students.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Šobrīd šai organizācijai nav reģistrētu skolēnu.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2 text-sm">
            {students.map((s, idx) => (
              <div
                key={s.id}
                className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between hover:border-sky-400/60 hover:shadow-md hover:shadow-sky-500/20 transition-all"
                style={{ animationDelay: `${idx * 35}ms` }}
              >
                <div>
                  <p className="font-semibold">{s.full_name}</p>
                  <p className="text-slate-400 text-xs">{s.email}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-300">
                    Grupa:{" "}
                    <span className="font-semibold">
                      {s.group_name || "nav norādīta"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">
          Pievienot skolēnu grupai
        </h2>
        <form onSubmit={handleAssignStudentToGroup} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Skolēns
            </label>
            <select
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">-- Izvēlies skolēnu --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Grupa</label>
            <select
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedGroupForStudent}
              onChange={(e) => setSelectedGroupForStudent(e.target.value)}
            >
              <option value="">-- Izvēlies grupu --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="text-xs text-amber-300 mt-1">
                Nav izveidotu grupu – izveido tās sadaļā “Grupas”.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-[1px]"
          >
            Saglabāt izmaiņas
          </button>
        </form>
      </div>
    </div>
  );
}

function GroupsTab(props) {
  const { groups, newGroupName, setNewGroupName, handleCreateGroup, students } =
    props;

  // skaitam skolēnu skaitu katrā grupā
  const countByGroup = groups.reduce((acc, g) => {
    acc[g.name] = students.filter((s) => s.group_name === g.name).length;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 fade-in-up">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-3">Grupas</h2>
        {groups.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Nav nevienas grupas. Izveido pirmo pa labi.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {groups.map((g, idx) => (
              <div
                key={g.id}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 hover:border-emerald-400/70 hover:shadow-md hover:shadow-emerald-500/20 transition-all"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <p className="font-semibold mb-1">{g.name}</p>
                <p className="text-xs text-slate-400">
                  Skolēnu skaits:{" "}
                  <span className="font-semibold text-emerald-300">
                    {countByGroup[g.name] || 0}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Izveidot jaunu grupu</h2>
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Grupas nosaukums
            </label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Piemēram, 2TIP-1"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-[1px]"
          >
            Izveidot grupu
          </button>
        </form>
      </div>
    </div>
  );
}

function SubmissionsTab({ submissions, formatDate }) {
  return (
    <div className="card p-6 fade-in-up">
      <h2 className="text-xl font-semibold mb-3">Iesniegtie darbi</h2>
      {submissions.length === 0 ? (
        <p className="text-slate-400 text-sm">
          Vēl nav neviena iesniegta darba.
        </p>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 text-sm">
          {submissions.map((s, idx) => (
            <div
              key={s.id}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-400/70 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="space-y-1">
                <p className="font-semibold">
                  {s.tasks?.title || "Nezināms uzdevums"}
                </p>
                <p className="text-slate-300">
                  Students:{" "}
                  <span className="font-semibold">
                    {s.students?.full_name || "Nezināms"}
                  </span>{" "}
                  <span className="text-slate-400">
                    ({s.students?.email || "nav e-pasta"})
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Grupa: {s.students?.group_name || "nav norādīta"}
                </p>
                <p className="text-xs text-slate-500">
                  Iesniegts: {formatDate(s.uploaded_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={s.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-xs font-semibold shadow-md shadow-indigo-500/30 transition-transform hover:-translate-y-[1px]"
                >
                  Lejupielādēt failu
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
