import { useState } from "react";
import { useProjectStore } from "../../stores/project.store";
import { useAuthStore } from "../../stores/useAuthStore";
import { Link } from "react-router-dom";
import ProjectEditModal from "./ProjectEditModal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function ProjectList() {
  const { projects, rename, remove } = useProjectStore();
  const uid = useAuthStore(s=>s.user?.uid);

  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const project = projects.find(p=>p.id===editId);

  if (!projects.length) return <p className="text-gray-500">No projects yet.</p>;

  return (
    <>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const isOwner = p.owner === uid;
          return (
            <li key={p.id} className="border rounded-lg p-4 hover:shadow flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{p.name}</h3>
                {isOwner && (
                  <div className="flex gap-2">
                    <button onClick={()=>setEditId(p.id)} className="text-xs px-2 py-1 border rounded">Edit</button>
                    <button onClick={()=>setDelId(p.id)} className="text-xs px-2 py-1 border rounded text-red-600">Delete</button>
                  </div>
                )}
              </div>
              <Link to={`/p/${p.id}`} className="text-blue-600 text-sm">Open</Link>
            </li>
          );
        })}
      </ul>

      {editId && project && (
        <ProjectEditModal
          initialName={project.name}
          onSave={async (name)=>{ await rename(editId, name); setEditId(null); }}
          onClose={()=>setEditId(null)}
        />
      )}

      {delId && (
        <ConfirmDialog
          title="Delete project?"
          message="This will permanently remove the project and its tasks."
          onCancel={()=>setDelId(null)}
          onConfirm={async ()=>{ await remove(delId); setDelId(null); }}
        />
      )}
    </>
  );
}
