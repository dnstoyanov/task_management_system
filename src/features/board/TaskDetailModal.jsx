import { useState, useEffect } from "react";
import TaskChat from "../chat/TaskChat";
import { useAuthStore } from "../../stores/useAuthStore";
import { Link as LinkIcon, Copy, Trash2, X, Lock, Unlock, Pencil, Bell } from "lucide-react";
import { notifyAssignment } from "../../services/notification.service";

/* Status map + normalizer */
const STATUS_LABELS = {
  backlog: "Backlog",
  analyze: "Analyze",
  develop: "Develop",
  testing: "Testing",
  done: "Done",
};
const normalizeStatus = (s) => (s === "todo" ? "backlog" : s === "in_progress" ? "develop" : s);

/* Priority chips */
const PRIORITY_LABELS = { low: "Low", med: "Medium", high: "High" };
const PRIORITY_STYLES = {
  low: "bg-green-100 text-green-700 border-green-200",
  med: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};
const priorityClass = (p) => PRIORITY_STYLES[p] || PRIORITY_STYLES.med;

function IconButton({ title, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center h-8 w-8 border rounded hover:bg-gray-100 active:scale-[.98] ${className}`}
    >
      {children}
    </button>
  );
}

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
  onClone,
}) {
  const myUid = useAuthStore((s) => s.user?.uid);

  const memberName = (uid) =>
    members.find((m) => m.id === uid)?.displayName ||
    members.find((m) => m.id === uid)?.email ||
    uid;

  const isAssignee = !!myUid && task.assignee === myUid;
  const lockedForMe = task.locked && !isOwner;
  const canEditAssigneePriority = isOwner && !lockedForMe;
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

  const statusValue = normalizeStatus(task.status);

  // notify on assignee change
  async function handleAssigneeChange(val) {
    const prev = task.assignee || null;
    await onChangeAssignee?.(val || null);
    if (val && val !== prev) {
      await notifyAssignment({ pid, taskId: task.id, toUid: val, byUid: myUid });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      {/* Shrink if few comments; otherwise grow up to 85vh */}
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow">
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2 justify-end">
          <IconButton title="Copy link" onClick={onCopyLink}><LinkIcon size={18} /></IconButton>
          <IconButton title="Clone task" onClick={() => onClone?.()}><Copy size={18} /></IconButton>
          {isOwner && (
            <>
              <IconButton title={task.locked ? "Unlock" : "Lock"} onClick={onToggleLock}>
                {task.locked ? <Unlock size={18} /> : <Lock size={18} />}
              </IconButton>
              <IconButton title="Delete task" onClick={onDelete} className="border-red-200">
                <Trash2 size={18} className="text-red-600" />
              </IconButton>
            </>
          )}
          <IconButton title="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[calc(85vh-56px)]">
          {/* LEFT: title, description, comments */}
          <div className="md:col-span-2 p-5 space-y-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{task.title}</h2>
              {task.locked && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100">Locked</span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Description</h3>
                {isOwner && !lockedForMe && !editingDesc && (
                  <IconButton
                    title={task.description ? "Edit description" : "Add description"}
                    onClick={() => setEditingDesc(true)}
                  >
                    <Pencil size={16} />
                  </IconButton>
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

            {/* Chat fills remaining height */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold mb-2">Comments</h3>
              <TaskChat
                pid={pid}
                task={task}
                members={members}
                isOwner={isOwner}
                disabled={lockedForMe}
              />
            </div>
          </div>

          {/* RIGHT: details */}
          <aside className="border-l p-5 space-y-4 bg-gray-50 overflow-y-auto">
            {/* Status */}
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              {canChangeStatus ? (
                <select
                  className="text-sm px-2 py-1 rounded border bg-white w-[12rem] block"
                  value={statusValue}
                  onChange={(e) => onChangeStatus && onChangeStatus(e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm w-[12rem] font-semibold text-left">
                  {STATUS_LABELS[statusValue]}
                </div>
              )}
              {!canChangeStatus && (
                <p className="text-xs text-gray-500 mt-1">Only the owner or assignee can change status.</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Details</h4>
              <dl className="text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Owner</dt>
                  <dd className="min-w-[12rem] font-semibold text-right">
                    {ownerProfile?.displayName || ownerProfile?.email || ownerProfile?.id || "—"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">Assignee</dt>
                  <dd className="min-w-[12rem]">
                    {canEditAssigneePriority ? (
                      <select
                        className="w-[12rem] ml-auto block border rounded px-2 py-1 bg-white"
                        value={task.assignee || ""}
                        onChange={(e) => handleAssigneeChange(e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="block w-[12rem] ml-auto text-right font-semibold">
                        {task.assignee ? memberName(task.assignee) : "Unassigned"}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">Priority</dt>
                  <dd className="min-w-[12rem]">
                    {canEditAssigneePriority ? (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          className="w-[8.5rem] border rounded px-2 py-1 bg-white"
                          value={task.priority}
                          onChange={(e) => onChangePriority && onChangePriority(e.target.value)}
                        >
                          <option value="low">Low</option>
                          <option value="med">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <span className={`inline-flex items-center justify-center text-[11px] px-2 py-0.5 rounded border ${priorityClass(task.priority)}`}>
                          {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </span>
                      </div>
                    ) : (
                      <span className={`block w-[8.5rem] ml-auto text-center text-[11px] px-2 py-0.5 rounded border ${priorityClass(task.priority)}`}>
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                    )}
                  </dd>
                </div>

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
