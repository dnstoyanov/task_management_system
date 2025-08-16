import { useState, useEffect } from "react";
import TaskChat from "../chat/TaskChat";
import { useAuthStore } from "../../stores/useAuthStore";

/* NEW: status map + normalizer */
const STATUS_LABELS = {
  backlog: "Backlog",
  analyze: "Analyze",
  develop: "Develop",
  testing: "Testing",
  done: "Done",
};
const normalizeStatus = (s) => (s === "todo" ? "backlog" : s === "in_progress" ? "develop" : s);

export default function TaskDetailModal({
  pid,
  task,
  members = [],
  ownerProfile = null,
  isOwner = false,
  onClose,
  onDelete,
  onToggleLock,
  onCopyLink,
  onChangeStatus,
  onChangeAssignee,
  onChangePriority,
  onChangeDescription,
}) {
  const myUid = useAuthStore((s) => s.user?.uid);

  const memberName = (uid) =>
    members.find((m) => m.id === uid)?.displayName ||
    members.find((m) => m.id === uid)?.email ||
    uid;

  const priorityLabel = { low: "Low", med: "Medium", high: "High" };

  const isAssignee = !!myUid && task.assignee === myUid;
  const lockedForMe = task.locked && !isOwner;
  const canEditAssigneePriority = isOwner && !lockedForMe; // owner only
  const canChangeStatus = (isOwner || isAssignee) && (!task.locked || isOwner);

  // description editor
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || "");
  useEffect(() => {
    setEditingDesc(false);
    setDescDraft(task.description || "");
  }, [task.id, task.description]);

  const saveDesc = async () => {
    if (!isOwner || lockedForMe) return;
    await onChangeDescription?.(descDraft.trim());
    setEditingDesc(false);
  };
  const clearDesc = async () => {
    if (!isOwner || lockedForMe) return;
    await onChangeDescription?.("");
    setDescDraft("");
    setEditingDesc(false);
  };

  // ensure UI uses the new values
  const statusValue = normalizeStatus(task.status);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow">
        {/* header */}
        <div className="p-3 border-b flex items-center gap-2 justify-end">
          <button onClick={onCopyLink} className="px-3 py-1 border rounded">Copy link</button>
          {isOwner && (
            <>
              <button onClick={onToggleLock} className="px-3 py-1 border rounded">
                {task.locked ? "Unlock" : "Lock"}
              </button>
              <button onClick={onDelete} className="px-3 py-1 border rounded text-red-600">Delete</button>
            </>
          )}
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[calc(85vh-56px)]">
          {/* left: title, description, comments */}
          <div className="md:col-span-2 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{task.title}</h2>
              {task.locked && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100">Locked</span>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Description</h3>
                {isOwner && !lockedForMe && !editingDesc && (
                  <button className="text-xs border rounded px-2 py-1" onClick={() => setEditingDesc(true)}>
                    {task.description ? "Edit" : "Add description"}
                  </button>
                )}
              </div>

              {editingDesc ? (
                <>
                  <textarea
                    className="w-full border rounded px-3 py-2 min-h-[120px]"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Write a detailed description..."
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="px-3 py-1 rounded bg-black text-white">Save</button>
                    <button
                      onClick={() => { setEditingDesc(false); setDescDraft(task.description || ""); }}
                      className="px-3 py-1 border rounded"
                    >
                      Cancel
                    </button>
                    {task.description && (
                      <button onClick={clearDesc} className="px-3 py-1 border rounded text-red-600">Clear</button>
                    )}
                  </div>
                </>
              ) : task.description ? (
                <p className="whitespace-pre-wrap text-gray-700">{task.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No description</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Comments</h3>
              <TaskChat pid={pid} task={task} isOwner={isOwner} disabled={lockedForMe} />
            </div>
          </div>

          {/* right: details */}
          <aside className="border-l p-5 space-y-4 bg-gray-50 overflow-y-auto">
            {/* Status */}
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <select
                className="text-sm px-2 py-1 rounded border bg-white w-[12rem] ml-auto block"
                value={statusValue}
                disabled={!canChangeStatus}
                onChange={(e) => onChangeStatus && onChangeStatus(e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {!canChangeStatus && (
                <p className="text-xs text-gray-500 mt-1">Only the owner or assignee can change status.</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Details</h4>
              <dl className="text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Owner</dt>
                  <dd className="min-w-[12rem] text-right">
                    {ownerProfile?.displayName || ownerProfile?.email || ownerProfile?.id || "—"}
                  </dd>
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">Assignee</dt>
                  <dd className="min-w-[12rem]">
                    {canEditAssigneePriority ? (
                      <select
                        className="w-[12rem] ml-auto block border rounded px-2 py-1 bg-white"
                        value={task.assignee || ""}
                        onChange={(e) => onChangeAssignee && onChangeAssignee(e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="block w-[12rem] ml-auto text-right">
                        {task.assignee ? memberName(task.assignee) : "Unassigned"}
                      </span>
                    )}
                  </dd>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">Priority</dt>
                  <dd className="min-w-[12rem]">
                    {canEditAssigneePriority ? (
                      <select
                        className="w-[12rem] ml-auto block border rounded px-2 py-1 bg-white"
                        value={task.priority}
                        onChange={(e) => onChangePriority && onChangePriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="med">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <span className="block w-[12rem] ml-auto text-right">
                        {priorityLabel[task.priority] ?? task.priority}
                      </span>
                    )}
                  </dd>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="min-w-[12rem] text-right">
                    {task.createdAt?.toDate ? task.createdAt.toDate().toLocaleString() : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="min-w-[12rem] text-right">
                    {task.updatedAt?.toDate ? task.updatedAt.toDate().toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
