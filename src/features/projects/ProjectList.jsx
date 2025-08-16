import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "../../core/firebase";
import { useAuthStore } from "../../stores/useAuthStore";
import ProjectCard from "./ProjectCard";

/** normalize legacy statuses */
function normalizeStatus(s) {
  if (s === "todo") return "backlog";
  if (s === "in_progress") return "develop";
  return s || "backlog";
}

export default function ProjectList() {
  const me = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({}); // { [pid]: { total, byStatus } }

  // ✅ Watch ALL projects (no owner/member filter)
  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjects(all);
    });
    return () => unsub();
  }, []);

  // Watch each project's tasks to compute status breakdown
  useEffect(() => {
    if (!projects.length) {
      setStats({});
      return;
    }
    const unsubs = [];
    projects.forEach((p) => {
      const u = onSnapshot(collection(db, "projects", p.id, "tasks"), (snap) => {
        let total = 0;
        const byStatus = { backlog: 0, analyze: 0, develop: 0, testing: 0, done: 0 };
        snap.forEach((d) => {
          const t = d.data();
          total += 1;
          const s = normalizeStatus(t.status);
          if (byStatus[s] !== undefined) byStatus[s] += 1;
        });
        setStats((prev) => ({ ...prev, [p.id]: { total, byStatus } }));
      });
      unsubs.push(u);
    });
    return () => unsubs.forEach((u) => u && u());
  }, [projects]);

  const openProject = (id) => navigate(`/p/${id}`);

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  // Show "my" projects first for convenience, then alphabetical by title/name
  const ordered = useMemo(() => {
    return [...projects].sort((a, b) => {
      const ao = a.owner === me?.uid ? -1 : 0;
      const bo = b.owner === me?.uid ? -1 : 0;
      if (ao !== bo) return ao - bo;
      const at = (a.title || a.name || "").toLowerCase();
      const bt = (b.title || b.name || "").toLowerCase();
      return at.localeCompare(bt);
    });
  }, [projects, me?.uid]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {ordered.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          taskStats={stats[p.id]}
          onOpen={() => openProject(p.id)}           // clicking the whole card opens
          onDelete={() => deleteProject(p.id)}       // owner-only icon shown in card
          showDelete={p.owner === me?.uid}
        />
      ))}

      {!ordered.length && (
        <div className="col-span-full rounded-lg border bg-white p-8 text-center text-gray-500">
          No projects found.
        </div>
      )}
    </div>
  );
}
