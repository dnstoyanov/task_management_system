// src/app/features/board/Column.jsx
import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

export default function Column({
  title,
  status,
  tasks = [],
  members = [],
  meUid,
  isOwner,
  isMemberMe,
  onCreate,
  onOpen,
  onDelete,
  onChangeState,
  onChangeStatus,
  onChangePriority,
  canDragOrChangeStatus, // fn(task) -> boolean
}) {
  const canDragFn = canDragOrChangeStatus || (() => true);

  return (
    <div className="bg-gray-50 rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">
          {title} ({tasks.length})
        </h3>
        <button
          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
          onClick={() => onCreate(status)}
        >
          + New
        </button>
      </div>

      <Droppable droppableId={status} type="TASK">
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={`space-y-3 min-h-[40px] ${
              dropSnapshot.isDraggingOver ? "bg-blue-50" : ""
            } rounded-md p-1 transition`}
          >
            {tasks.map((t, index) => (
              <Draggable
                key={t.id}
                draggableId={t.id}
                index={index}
                isDragDisabled={!canDragFn(t)}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? "rotate-[0.2deg]" : ""}
                  >
                    <TaskCard
                      task={t}
                      members={members}
                      status={status}
                      meUid={meUid}
                      isOwner={isOwner}
                      isMemberMe={isMemberMe}
                      onOpen={() => onOpen(t)}
                      onDelete={() => onDelete(t)}
                      onChangeState={(v) => onChangeState(t, v)}
                      onChangeStatus={(v) => onChangeStatus(t, v)}
                      onChangePriority={(v) => onChangePriority(t, v)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
