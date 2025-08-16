import TaskCard from "./TaskCard";
export default function Column({ title, status, tasks, onCreate, onEdit, onDelete, onMove, renderExtra }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{title} ({tasks.length})</h3>
        <button onClick={() => onCreate(status)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white">+ New</button>
      </div>
      <div className="space-y-3">
        {tasks.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            onEdit={() => onEdit(t)}
            onDelete={() => onDelete(t)}
            onMove={(to) => onMove(t, to)}
            extra={renderExtra ? renderExtra(t) : null}
          />
        ))}
        {!tasks.length && <p className="text-xs text-gray-400">No tasks</p>}
      </div>
    </div>
  );
}
