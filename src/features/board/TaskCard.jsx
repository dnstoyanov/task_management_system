const statusColor = {
  backlog: "bg-gray-400",
  analyze: "bg-sky-400",
  develop: "bg-violet-500",
  testing: "bg-amber-500",
  done: "bg-green-500",
};
const statusLabel = {
  backlog: "Backlog",
  analyze: "Analyze",
  develop: "Develop",
  testing: "Testing",
  done: "Done",
};
const stateLabel = {
  new: "New",
  active: "Active",
  review: "Review",
  blocked: "Blocked",
  closed: "Closed",
};
const priorityLabel = { low: "Low", med: "Medium", high: "High" };

function AssigneeAvatar({ user }) {
  if (user?.photoURL) return <img alt="" src={user.photoURL} className="w-5 h-5 rounded-full" />;
  const letter = (user?.displayName || user?.email || "?")[0]?.toUpperCase?.() || "?";
  return (
    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold">
      {letter}
    </div>
  );
}

export default function TaskCard({
  task,
  members,
  meUid,
  isOwner,
  isMemberMe,
  onOpen,
  onDelete,
  onChangeState,
  onChangeStatus,
  onChangePriority,
}) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const assigneeUser = task.assignee ? memberMap[task.assignee] : null;

  const canChangeStatus = !task.locked && (isOwner || (isMemberMe && meUid === task.assignee));
  const canChangeState = !task.locked && isOwner;
  const canChangePriority = !task.locked && isOwner;

  return (
    <div className="relative border rounded-lg bg-white shadow-sm p-3 cursor-pointer" onClick={onOpen}>
      {/* left color stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${statusColor[task.status] || "bg-gray-300"}`} />

      {/* title + priority badge */}
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{task.title}</h4>
        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 capitalize">{task.priority}</span>
      </div>

      {/* description preview */}
      {task.description && (
        <p className="text-[12px] text-gray-600 line-clamp-3 mt-1">{task.description}</p>
      )}

      {/* assignee row (NO state/status here) */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
        <AssigneeAvatar user={assigneeUser} />
        <span className="truncate">{assigneeUser?.displayName || assigneeUser?.email || "Unassigned"}</span>
      </div>

      {/* footer actions */}
      <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        {/* bottom-left: State / Status / Priority */}
        <div className="flex gap-2 items-center">
          {/* State (owner only) */}
          {canChangeState ? (
            <select
              className="text-xs border rounded px-2 py-1 bg-white"
              value={task.state || "new"}
              onChange={(e) => onChangeState(e.target.value)}
            >
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="closed">Closed</option>
            </select>
          ) : (
            <span className="text-xs text-gray-600">State: {stateLabel[task.state] || task.state || "New"}</span>
          )}

          {/* Status (owner or assignee) */}
          {canChangeStatus ? (
            <select
              className="text-xs border rounded px-2 py-1 bg-white"
              value={task.status}
              onChange={(e) => onChangeStatus(e.target.value)}
            >
              <option value="backlog">Backlog</option>
              <option value="analyze">Analyze</option>
              <option value="develop">Develop</option>
              <option value="testing">Testing</option>
              <option value="done">Done</option>
            </select>
          ) : (
            <span className="text-xs text-gray-600">Status: {statusLabel[task.status] || task.status}</span>
          )}

          {/* Priority (owner only) */}
          {canChangePriority ? (
            <select
              className="text-xs border rounded px-2 py-1 bg-white"
              value={task.priority}
              onChange={(e) => onChangePriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          ) : (
            <span className="text-xs text-gray-600">
              Priority: {priorityLabel[task.priority] ?? task.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
