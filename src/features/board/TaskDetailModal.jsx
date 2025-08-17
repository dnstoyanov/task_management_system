// src/features/board/TaskDetailModal.jsx
import { useState, useEffect, useRef } from "react";
import TaskChat from "../chat/TaskChat";
import { useAuthStore } from "../../stores/useAuthStore";
import { Link as LinkIcon, Copy, Trash2, X, Lock, Unlock, Pencil } from "lucide-react";
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
      className={`inline-flex items-center justify-center h-8 w-8 rounded hover:bg-gray-100 active:scale-[.98] ${className}`}
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
  onChangeTitle, // <-- keep this wired from Board.jsx
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

  /* ---------------- Title editor ---------------- */
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title || "");
  const titleInputRef = useRef(null);

  useEffect(() => {
    setEditingTitle(false);
    setTitleDraft(task.title || "");
  }, [task.id, task.title]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const saveTitle = async () => {
    if (!isOwner || lockedForMe) return;
    const next = (titleDraft || "").trim();
    setEditingTitle(false); // close optimistically
    if (next && next !== (task.title || "")) {
      await onChangeTitle?.(next);
    } else {
      setTitleDraft(task.title || "");
    }
  };
  const cancelTitle = () => {
    setEditingTitle(false);
    setTitleDraft(task.title || "");
  };

  /* ---------------- Description editor (now matches title UX) ---------------- */
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || "");
  const descRef = useRef(null);

  useEffect(() => {
    setEditingDesc(false);
    setDescDraft(task.description || "");
  }, [task.id, task.description]);

  useEffect(() => {
    if (editingDesc && descRef.current) {
      descRef.current.focus();
      // place caret at end
      const el = descRef.current;
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [editingDesc]);

  const saveDesc = async () => {
    if (!isOwner || lockedForMe) return;
    const next = (descDraft || "").trim();
    setEditingDesc(false); // close optimistically
    // allow empty string (clearing description)
    if (next !== (task.description || "")) {
      await onChangeDescription?.(next);
    } else {
      setDescDraft(task.description || "");
    }
  };
  const cancelDesc = () => {
    setEditingDesc(false);
    setDescDraft(task.description || "");
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
      {/* Container */}
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2 justify-end shrink-0">
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

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 min-h-0">
          {/* LEFT side */}
          <div className="md:col-span-2 p-5 overflow-y-auto md:overflow-hidden flex flex-col gap-4 min-h-0">
            {/* Title row with RIGHT edit icon */}
            <div className="flex items-center gap-2 shrink-0">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  className="flex-1 border rounded px-3 py-1.5 text-xl font-semibold"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") cancelTitle();
                  }}
                  onBlur={saveTitle}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">{task.title}</h2>
                  {task.locked && (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-100">Locked</span>
                  )}
                </div>
              )}

              {isOwner && !lockedForMe && !editingTitle && (
                <IconButton title="Edit title" onClick={() => setEditingTitle(true)}>
                  <Pencil size={16} />
                </IconButton>
              )}
            </div>

            {/* Description header with RIGHT edit icon */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center gap-2">
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
                <textarea
                  ref={descRef}
                  className="w-full border rounded px-3 py-2 min-h-[120px]"
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={saveDesc}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveDesc();
                    if (e.key === "Escape") cancelDesc();
                  }}
                  placeholder="Write a detailed description..."
                />
              ) : task.description ? (
                <p className="whitespace-pre-wrap text-gray-700">{task.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No description</p>
              )}
            </div>

            {/* Divider */}
            <hr className="border-t border-gray-200" />

            {/* Chat area */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <h3 className="font-semibold mb-2 shrink-0">Comments</h3>
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="min-h-full flex flex-col justify-end">
                  <TaskChat
                    pid={pid}
                    task={task}
                    members={members}
                    isOwner={isOwner}
                    disabled={lockedForMe}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT side */}
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
