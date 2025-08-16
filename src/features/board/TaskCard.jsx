import React from "react";

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
  low:  "bg-green-100 text-green-700 border-green-200",
  med:  "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};

function normalizeString(val, allowed, fallback) {
  let out = typeof val === "string" ? val : (val && val.value) || "";
  if (!allowed.includes(out)) out = fallback;
  return out;
}

function AssigneeAvatar({ user, size = "md" }) {
  const S = {
    sm: { box: "w-5 h-5", txt: "text-[10px]" },
    md: { box: "w-7 h-7", txt: "text-[12px]" },
    lg: { box: "w-9 h-9", txt: "text-[14px]" },
  }[size];

  if (user?.photoURL) {
    return <img alt="" src={user.photoURL} className={`${S.box} rounded-full object-cover`} />;
  }
  const letter = (user?.displayName || user?.email || "?").toString().trim().charAt(0).toUpperCase();
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
  onOpen,
  onDelete,
  onChangeState,
  onChangeStatus,
  onChangePriority,
}) {
  const statusValue   = normalizeString(task.status,  ["backlog","analyze","develop","testing","done"], "backlog");
  const stateValue    = normalizeString(task.state,   ["new","active","review","blocked","closed"], "new");
  const priorityValue = normalizeString(task.priority,["low","med","high"], "low");

  const priorityClass = PRIORITY_STYLES[priorityValue] || PRIORITY_STYLES.med;
  const priorityText  = PRIORITY_LABEL[priorityValue];

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const assigneeUser = task.assignee ? memberMap[task.assignee] : null;
  const assigneeText = assigneeUser?.displayName || assigneeUser?.email || "Unassigned";

  const canChangeStatus   = !task.locked && (isOwner || (isMemberMe && meUid === task.assignee));
  const canChangeState    = !task.locked && isOwner;
  const canChangePriority = !task.locked && isOwner;

  const accent = STATUS_COLOR[statusValue] || "bg-gray-300";

  return (
    <div className="relative border rounded-lg bg-white shadow-sm p-3 cursor-pointer" onClick={() => onOpen?.(task)}>
      {/* left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${accent}`} />

      {/* title + priority pill */}
      <div className="flex justify-between items-start gap-3">
        <h4 className="font-medium break-words pr-2">{String(task.title || "")}</h4>
        <span
          className={`text-[10px] px-2 py-0.5 text-sm rounded border ${priorityClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {priorityText}
        </span>
      </div>

      {/* description */}
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

      {/* assignee */}
      <div className="flex items-center gap-2 mt-6 text-xs text-gray-700">
        <AssigneeAvatar user={assigneeUser} />
        <span className="truncate text-sm">{assigneeText}</span>
      </div>

      {/* footer controls */}
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
