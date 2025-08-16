export default function TaskCard({ task, onEdit, onDelete, onMove, extra }) {
  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{task.title}</h4>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{task.priority}</span>
      </div>
      {task.assignee && <div className="text-xs text-gray-600">Assignee: {task.assignee}</div>}
      {task.description && <p className="text-sm text-gray-600 line-clamp-3">{task.description}</p>}
      <div className="flex gap-2 mt-1 items-center">
        {task.status !== "todo" && <button onClick={() => onMove("todo")} className="text-xs border rounded px-2 py-1">To Do</button>}
        {task.status !== "in_progress" && <button onClick={() => onMove("in_progress")} className="text-xs border rounded px-2 py-1">In Progress</button>}
        {task.status !== "done" && <button onClick={() => onMove("done")} className="text-xs border rounded px-2 py-1">Done</button>}
        <div className="ml-auto flex gap-2">
          {extra}
          <button onClick={onEdit} className="text-xs border rounded px-2 py-1">Edit</button>
          <button onClick={onDelete} className="text-xs border rounded px-2 py-1 text-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}
