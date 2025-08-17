import React from "react";
import { MoreVertical } from "lucide-react";

const STATUS_COLOR = {
  backlog: "bg-gray-400",
  analyze: "bg-sky-400",
  develop: "bg-violet-500",
  testing: "bg-amber-500",
  done: "bg-green-500",
};
const STATUS_LABEL = {
  backlog: "Backlog",
  analyze: "Analyze",
  develop: "Develop",
  testing: "Testing",
  done: "Done",
};
const STATE_LABEL = {
  new: "New",
  active: "Active",
  review: "Review",
  blocked: "Blocked",
  closed: "Closed",
};
const PRIORITY_LABEL = { low: "Low", med: "Medium", high: "High" };
const PRIORITY_STYLES = {
  low: "bg-green-100 text-green-700 border-green-200",
  med: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};

function normalizeString(val, allowed, fallback) {
  const out = typeof val === "string" ? val : (val && val.value) || "";
  return allowed.includes(out) ? out : fallback;
}

function AssigneeAvatar({ user, size = "md" }) {
  const S = {
    sm: { box: "w-5 h-5", txt: "text-[10px]" },
    md: { box: "w-7 h-7", txt: "text-[12px]" },
    lg: { box: "w-9 h-9", txt: "text-[14px]" },
  }[size];

  if (user?.photoURL) {
    return (
      <img alt="" src={user.photoURL} className={`${S.box} rounded-full object-cover`} />
    );
  }
  const letter = (user?.displayName || user?.email || "?")
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <div className={`${S.box} rounded-full bg-gray-200 flex items-center justify-center font-semibold ${S.txt}`}>
      {letter}
    </div>
  );
}

export default function TaskCard({
  task,
  members = [],
  meUid,
  isOwner,
  isMemberMe,
  canMove,
  onOpen,
  onDelete,
  onChangeState,
  onChangeStatus,
  onChangePriority,
  variant = "board",
}) {
  const statusValue = normalizeString(
    task.status, ["backlog", "analyze", "develop", "testing", "done"], "backlog"
  );
  const stateValue = normalizeString(
    task.state, ["new", "active", "review", "blocked", "closed"], "new"
  );
  const priorityValue = normalizeString(
    task.priority, ["low", "med", "high"], "low"
  );

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const assigneeUser = task.assignee ? memberMap[task.assignee] : null;

  // 🔐 Normalize: treat task.assignee as UID; if it's an email, try to resolve to UID
  let assigneeUid = task.assignee || null;
  if (assigneeUid && typeof assigneeUid === "string" && assigneeUid.includes("@")) {
    const m = members.find((m) => (m.email || "").toLowerCase() === assigneeUid.toLowerCase());
    assigneeUid = m?.id || null;
  }

  const assigneeText = assigneeUser?.displayName || assigneeUser?.email || "Unassigned";

  const canMoveComputed =
    canMove ?? (!task.locked && (isOwner || (isMemberMe && meUid && assigneeUid && meUid === assigneeUid)));

  const canChangeStatus =
    !task.locked && (isOwner || (isMemberMe && meUid && assigneeUid && meUid === assigneeUid));
  const canChangeState = !task.locked && isOwner;
  const canChangePriority = !task.locked && isOwner;

  const priorityClass = PRIORITY_STYLES[priorityValue] || PRIORITY_STYLES.med;
  const accent = STATUS_COLOR[statusValue] || "bg-gray-300";

  return (
    <div
      className="relative border rounded-lg bg-white shadow-sm p-3 cursor-pointer"
      onClick={() => onOpen?.(task)}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${accent}`} />

      {variant === "board" ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <h4 className="font-medium break-words">{String(task.title || "")}</h4>
            <span
              className={`shrink-0 text-[11px] px-2 py-0.5 rounded border ${priorityClass}`}
              onClick={(e) => e.stopPropagation()}
            >
              {PRIORITY_LABEL[priorityValue]}
            </span>
          </div>

          {canMoveComputed && (
            <span
              className="shrink-0 p-1 rounded text-gray-500 cursor-grab select-none"
              title="Drag"
              aria-hidden="true"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={16} />
            </span>
          )}
        </div>
      ) : (
        <div className="flex justify-between items-start gap-3">
          <h4 className="font-medium break-words pr-2">{String(task.title || "")}</h4>
          <span
            className={`text-[11px] px-2 py-0.5 rounded border ${priorityClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {PRIORITY_LABEL[priorityValue]}
          </span>
        </div>
      )}

      {task.description ? (
        <p
          className="text-[12px] text-gray-600 mt-3 break-words"
          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {String(task.description)}
        </p>
      ) : (
        <p className="text-[12px] text-gray-400 mt-2 italic">No description</p>
      )}

      <div className="flex items-center gap-2 mt-6 text-xs text-gray-700">
        <AssigneeAvatar user={assigneeUser} />
        <span className="truncate text-sm">{assigneeText}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {canChangeState ? (
          <select
            className="text-xs border rounded px-2 py-1 bg-white"
            value={stateValue}
            onChange={(e) => onChangeState?.(e.target.value)}
          >
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
            <option value="closed">Closed</option>
          </select>
        ) : (
          <span className="text-xs text-gray-600">State: {STATE_LABEL[stateValue]}</span>
        )}

        {canChangeStatus ? (
          <select
            className="text-xs border rounded px-2 py-1 bg-white"
            value={statusValue}
            onChange={(e) => onChangeStatus?.(e.target.value)}
          >
            <option value="backlog">Backlog</option>
            <option value="analyze">Analyze</option>
            <option value="develop">Develop</option>
            <option value="testing">Testing</option>
            <option value="done">Done</option>
          </select>
        ) : (
          <span className="text-xs text-gray-600">Status: {STATUS_LABEL[statusValue]}</span>
        )}

        {canChangePriority ? (
          <select
            className="text-xs border rounded px-2 py-1 bg-white"
            value={priorityValue}
            onChange={(e) => onChangePriority?.(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </select>
        ) : (
          <span className="text-xs text-gray-600">Priority: {PRIORITY_LABEL[priorityValue]}</span>
        )}
      </div>
    </div>
  );
}
