import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTaskStore } from "../../stores/task.store";
import TaskModal from "./TaskModal";
import { ProjectService } from "../../core/services/project.service";
import { UserService } from "../../core/services/user.service";
import TaskCard from "./TaskCard";
import Column from "./Column";
import TaskChat from "../chat/TaskChat";

export default function Board() {
  const { projectId } = useParams();
  const { tasks, start, stop, create, update, remove } = useTaskStore();

  const [members, setMembers] = useState([]); // [{id, displayName, email}]
  const [modal, setModal] = useState(null);   // null | {status} | task
  const [chatTask, setChatTask] = useState(null);

  useEffect(() => { // watch tasks
    start(projectId); return () => stop();
  }, [projectId, start, stop]);

  useEffect(() => { // watch project -> members
    const unsub = ProjectService.watchOne(projectId, async (p) => {
      if (!p) return setMembers([]);
      const profiles = await UserService.profiles(p.members || []);
      setMembers(profiles);
    });
    return () => unsub && unsub();
  }, [projectId]);

  const byStatus = useMemo(() => ({
    todo: tasks.filter(t => t.status === "todo"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    done: tasks.filter(t => t.status === "done"),
  }), [tasks]);

  const openCreate = (status) => setModal({ status });
  const openEdit = (task) => setModal(task);
  const openChat = (task) => setChatTask(task);

  const saveModal = async (data) => {
    if (modal?.id) await update(projectId, modal.id, data);
    else await create(projectId, { ...data, status: modal.status || data.status || "todo" });
    setModal(null);
  };
  const deleteTask = async (task) => { await remove(projectId, task.id); };
  const moveTask = async (task, to) => { await update(projectId, task.id, { status: to }); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Column title="To Do" status="todo"
        tasks={byStatus.todo}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteTask}
        onMove={moveTask}
        renderExtra={(t)=>(
          <button onClick={()=>openChat(t)} className="text-xs border rounded px-2 py-1">Chat</button>
        )}
      />
      <Column title="In Progress" status="in_progress"
        tasks={byStatus.in_progress}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteTask}
        onMove={moveTask}
        renderExtra={(t)=>(<button onClick={()=>openChat(t)} className="text-xs border rounded px-2 py-1">Chat</button>)}
      />
      <Column title="Done" status="done"
        tasks={byStatus.done}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteTask}
        onMove={moveTask}
        renderExtra={(t)=>(<button onClick={()=>openChat(t)} className="text-xs border rounded px-2 py-1">Chat</button>)}
      />

      {modal && (
        <TaskModal
          initial={modal.id ? modal : { status: modal.status }}
          members={members}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}

      {chatTask && (
        <TaskChat pid={projectId} task={chatTask} onClose={()=>setChatTask(null)} />
      )}
    </div>
  );
}
