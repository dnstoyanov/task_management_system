// src/features/projects/ProjectList.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { useAuthStore } from "../../stores/useAuthStore";
import ProjectCard from "./ProjectCard";
import { handleFirestoreError, notify } from "../../components/toast";

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

  // Watch ALL projects (you said dashboard must show all)
  useEffect(() => {
    if (!me) return;
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProjects(all);
      },
      (err) => handleFirestoreError(err, "Couldn’t load projects.")
    );
    return () => unsub();
  }, [me]);

  // Watch each project's tasks to compute status breakdown
  useEffect(() => {
    if (!projects.length) {
      setStats({});
      return;
    }
    const unsubs = [];
    projects.forEach((p) => {
      const u = onSnapshot(
        collection(db, "projects", p.id, "tasks"),
        (snap) => {
          let total = 0;
          const byStatus = { backlog: 0, analyze: 0, develop: 0, testing: 0, done: 0 };
          snap.forEach((d) => {
            const t = d.data();
            total += 1;
            const s = normalizeStatus(t.status);
            if (byStatus[s] !== undefined) byStatus[s] += 1;
          });
          setStats((prev) => ({ ...prev, [p.id]: { total, byStatus } }));
        },
        (err) => handleFirestoreError(err, "Couldn’t load tasks for a project.")
      );
      unsubs.push(u);
    });
    return () => unsubs.forEach((u) => u && u());
  }, [projects]);

  const openProject = (id) => navigate(`/p/${id}`);

  const deleteProject = async (id) => {
    try {
      if (!window.confirm("Delete this project?")) return;
      await deleteDoc(doc(db, "projects", id));
      notify.success("Project deleted.");
    } catch (e) {
      handleFirestoreError(e, "Couldn’t delete the project.");
    }
  };

  // Owner-first ordering, then alphabetically by name/title
  const ordered = useMemo(() => {
    return [...projects].sort((a, b) => {
      const ao = a.owner === me?.uid ? -1 : 0;
      const bo = b.owner === me?.uid ? -1 : 0;
      if (ao !== bo) return ao - bo;
      return (a.title || a.name || "").localeCompare(b.title || b.name || "");
    });
  }, [projects, me?.uid]);

  if (!me) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {ordered.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          taskStats={stats[p.id]}
          onOpen={() => openProject(p.id)}         // clicking the whole card opens
          onDelete={() => deleteProject(p.id)}     // owner-only icon shows inside the card
          showDelete={p.owner === me.uid}
        />
      ))}

      {!ordered.length && (
        <div className="col-span-full rounded-lg border bg-white p-8 text-center text-gray-500">
          No projects yet.
        </div>
      )}
    </div>
  );
}
