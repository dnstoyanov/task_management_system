import { useMemo, useState } from "react";

const mapOldStatus = (s) =>
  s === "todo" ? "backlog" : s === "in_progress" ? "develop" : s;

export default function TaskModal({ initial = {}, members = [], onSave, onClose }) {
  // normalize incoming values (for editing older tasks)
  const initialStatus = mapOldStatus(initial.status || "backlog");
  const initialState  = initial.state || "new";

  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [status, setStatus] = useState(initialStatus);
  const [state, setState] = useState(initialState);
  const [priority, setPriority] = useState(initial.priority || "med");
  const [assignee, setAssignee] = useState(initial.assignee || "");

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  const submit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      description,
      status,     // column
      state,      // work item state
      priority,
      assignee: assignee || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {initial.id ? "Edit Task" : "New Task"}
        </h2>

        <label className="block mb-3">
          <span className="text-sm">Title</span>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm">Description</span>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* State & Status */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-sm">State</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Status (Column)</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="backlog">Backlog</option>
              <option value="analyze">Analyze</option>
              <option value="develop">Develop</option>
              <option value="testing">Testing</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>

        {/* Priority & Assignee */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-sm">Priority</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Assignee</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={assignee || ""}
              onChange={(e) => setAssignee(e.target.value || "")}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName || m.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          >
            {initial.id ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
