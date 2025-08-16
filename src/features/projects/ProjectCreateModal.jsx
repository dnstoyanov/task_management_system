import { useState } from "react";

export default function ProjectCreateModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4">New Project</h2>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Project name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button
            onClick={() => name.trim() && onCreate(name.trim())}
            className="px-3 py-1 rounded bg-black text-white"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
