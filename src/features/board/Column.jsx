import TaskCard from "./TaskCard";

export default function Column({
  title, status, tasks,
  members, meUid, isOwner,
  onCreate, onOpen, onDelete,
  onChangeState, onChangeStatus, onChangePriority, isMemberMe
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{title} ({tasks.length})</h3>
        <button onClick={() => onCreate(status)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
          + New
        </button>
      </div>

      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            members={members}
            meUid={meUid}
            isOwner={isOwner}
            isMemberMe={isMemberMe}
            onOpen={() => onOpen(t)}
            onDelete={() => onDelete(t)}
            onChangeState={(v) => onChangeState(t, v)}
            onChangeStatus={(v) => onChangeStatus(t, v)}
            onChangePriority={(v) => onChangePriority(t, v)} 
          />
        ))}
        {!tasks.length && <p className="text-xs text-gray-400">No tasks</p>}
      </div>
    </div>
  );
}
