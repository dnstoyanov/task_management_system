import { useState } from "react";
import AppShell from "../app/layout/AppShell";
import ProjectList from "../features/projects/ProjectList";
import ProjectCreateModal from "../features/projects/ProjectCreateModal";
import { useAuthStore } from "../stores/useAuthStore";
import { useProjectStore } from "../stores/project.store";

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const uid = useAuthStore(s=>s.user?.uid);
  const create = useProjectStore(s=>s.create);

  const handleCreate = async (name) => {
    await create(name, uid);
    setOpen(false);
  };

  return (
    <AppShell onNewProject={() => setOpen(true)}>
      <ProjectList />
      {open && <ProjectCreateModal onCreate={handleCreate} onClose={()=>setOpen(false)} />}
    </AppShell>
  );
}
