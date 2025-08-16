import { useState } from "react";

export default function TaskModal({ initial = {}, members = [], onSave, onClose }) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [status, setStatus] = useState(initial.status || "todo");
  const [priority, setPriority] = useState(initial.priority || "med");
  const [assignee, setAssignee] = useState(initial.assignee || "");

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{initial.id ? "Edit Task" : "New Task"}</h2>

        <label className="block mb-3">
          <span className="text-sm">Title</span>
          <input className="mt-1 w-full border rounded px-3 py-2"
                 value={title} onChange={e=>setTitle(e.target.value)} />
        </label>

        <label className="block mb-3">
          <span className="text-sm">Description</span>
          <textarea className="mt-1 w-full border rounded px-3 py-2"
                    rows={4} value={description} onChange={e=>setDescription(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-sm">Status</span>
            <select className="mt-1 w-full border rounded px-3 py-2"
                    value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Priority</span>
            <select className="mt-1 w-full border rounded px-3 py-2"
                    value={priority} onChange={e=>setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="block mb-4">
          <span className="text-sm">Assignee</span>
          <select className="mt-1 w-full border rounded px-3 py-2"
                  value={assignee || ""} onChange={e=>setAssignee(e.target.value || null)}>
            <option value="">Unassigned</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button
            onClick={() => title.trim() && onSave({ title: title.trim(), description, status, priority, assignee: assignee || null })}
            className="px-3 py-1 rounded bg-black text-white"
          >
            {initial.id ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
