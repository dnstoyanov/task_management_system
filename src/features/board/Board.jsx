import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTaskStore } from "../../stores/task.store";
import { useAuthStore } from "../../stores/useAuthStore";
import TaskDetailModal from "./TaskDetailModal";
import TaskModal from "./TaskModal";
import Column from "./Column";
import { ProjectService } from "../../core/services/project.service";
import { UserService } from "../../core/services/user.service";

const normalizeStatus = (s) =>
  s === "todo" ? "backlog" : s === "in_progress" ? "develop" : s;

export default function Board() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);

  const { tasks, start, stop, create, update, remove } = useTaskStore();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);

  const [editModal, setEditModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);

  // ✅ wait for auth before starting the tasks listener
  useEffect(() => {
    if (!me) return;                // <-- gate until signed-in user is known
    start(projectId);
    return () => stop();
  }, [projectId, me, start, stop]);

  // ✅ and also gate the project/members listener
  useEffect(() => {
    if (!me) return;                // <-- gate until signed-in user is known
    const unsub = ProjectService.watchOne(projectId, async (p) => {
      setProject(p);
      if (!p) { setMembers([]); setOwnerProfile(null); return; }
      const profiles = await UserService.profiles(p.members || []);
      setMembers(profiles);
      setOwnerProfile(await UserService.profile(p.owner));
    });
    return () => unsub && unsub();
  }, [projectId, me]);

  const isOwner = !!(project && me && project.owner === me.uid);
  const isMemberMe = !!(project?.members || []).includes(me?.uid);

  // deep-link (?t=id)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tid = q.get("t");
    if (!tid) return;
    const t = tasks.find((x) => x.id === tid);
    if (t) setDetailTask(t);
  }, [location.search, tasks]);

  const byStatus = useMemo(() => {
    const list = tasks.map((t) => ({ ...t, status: normalizeStatus(t.status) }));
    return {
      backlog: list.filter((t) => t.status === "backlog"),
      analyze: list.filter((t) => t.status === "analyze"),
      develop: list.filter((t) => t.status === "develop"),
      testing: list.filter((t) => t.status === "testing"),
      done: list.filter((t) => t.status === "done"),
    };
  }, [tasks]);

  const openCreate = (status) => setEditModal({ status });
  const openDetail = (task) => {
    const q = new URLSearchParams(location.search);
    q.set("t", task.id);
    navigate({ pathname: location.pathname, search: q.toString() }, { replace: false });
    setDetailTask(task);
  };
  const closeDetail = () => {
    const q = new URLSearchParams(location.search);
    q.delete("t");
    navigate({ pathname: location.pathname, search: q.toString() }, { replace: true });
    setDetailTask(null);
  };

  const cloneTask = async (t) => {
    const { id, createdAt, updatedAt, ...rest } = t;
    await create(projectId, { ...rest, title: `${t.title} (copy)` });
  };

  // CRUD updates
  const saveForm = async (data) => {
    if (editModal?.id) await update(projectId, editModal.id, data);
    else await create(projectId, { ...data, status: editModal.status || "backlog" });
    setEditModal(null);
  };
  const deleteTask = async (task) => { await remove(projectId, task.id); if (detailTask?.id === task.id) closeDetail(); };
  const toggleLock = async () => { if (!detailTask) return; await update(projectId, detailTask.id, { locked: !detailTask.locked }); };
  const changeStatus = async (status) => { if (!detailTask) return; await update(projectId, detailTask.id, { status }); };
  const changeAssignee = async (assignee) => { if (!detailTask) return; await update(projectId, detailTask.id, { assignee: assignee || null }); };
  const changePriority = async (priority) => { if (!detailTask) return; await update(projectId, detailTask.id, { priority }); };
  const changeDescription = async (description) => { if (!detailTask) return; await update(projectId, detailTask.id, { description }); };
  const canChangePriority = (t) => !t.locked && isOwner;
  const changePriorityQuick = async (priority, id) => { await update(projectId, id, { priority }); };
  
  // const changeState = async (state, id) => { await update(projectId, id, { state }); };
  // const changeStatusQuick = async (status, id) => { await update(projectId, id, { status }); };

  // Board.jsx

const changeStatusQuick = async (status, id) => {
  const t = tasks.find(x => x.id === id);
  console.log("[status change attempt]", {
    me: me?.uid,
    assignee: t?.assignee,
    isOwner,
    isMemberMe,
    locked: t?.locked,
    from: t?.status,
    to: status,
    members: project?.members,
  });
  try {
    await update(projectId, id, { status });
  } catch (e) {
    console.error("[status update failed]", e);
  }
};

const changeState = async (state, id) => {
  const t = tasks.find(x => x.id === id);
  console.log("[state change attempt]", {
    me: me?.uid,
    isOwner,
    locked: t?.locked,
    from: t?.state,
    to: state,
  });
  try {
    await update(projectId, id, { state });
  } catch (e) {
    console.error("[state update failed]", e);
  }
};




  const copyLink = async () => {
    if (!detailTask) return;
    const url = `${window.location.origin}/p/${projectId}?t=${detailTask.id}`;
    try { await navigator.clipboard.writeText(url); alert("Link copied"); } catch { alert(url); }
  };

  const canChangeStatus = (t) => !t.locked && (isOwner || me?.uid === t.assignee);
  const canChangeState  = (t) => !t.locked && isOwner;

  // Optional: show nothing until auth ready (prevents render flashes)
  if (!me) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {[
        ["Backlog",  "backlog",  byStatus.backlog],
        ["Analyze",  "analyze",  byStatus.analyze],
        ["Develop",  "develop",  byStatus.develop],
        ["Testing",  "testing",  byStatus.testing],
        ["Done",     "done",     byStatus.done],
      ].map(([title, key, list]) => (
        <Column
          key={key}
          title={title}
          status={key}
          tasks={list}
          members={members}
          meUid={me?.uid}
          isOwner={isOwner}
          isMemberMe={isMemberMe}
          onCreate={openCreate}
          onOpen={openDetail}
          onDelete={deleteTask}
          onChangeState={(t, v)  =>
            canChangeState(t)  ? changeState(v, t.id)       : alert("Only the owner can change state.")
          }
          onChangeStatus={(t, v) =>
            canChangeStatus(t) ? changeStatusQuick(v, t.id) : alert("Only the owner or assignee can change status.")
          }
          onChangePriority={(t, v) =>
            canChangePriority(t) ? changePriorityQuick(v, t.id) : alert("Only the owner can change priority.")
          }
        />
      ))}

      {editModal && (
        <TaskModal
          initial={editModal.id ? editModal : { status: editModal.status || "backlog", state: "new" }}
          members={members}
          onSave={saveForm}
          onClose={() => setEditModal(null)}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          pid={projectId}
          task={tasks.find((t) => t.id === detailTask.id) || detailTask}
          members={members}
          ownerProfile={ownerProfile}
          isOwner={isOwner}
          onClose={closeDetail}
          onDelete={() => deleteTask(detailTask)}
          onToggleLock={toggleLock}
          onClone={() => cloneTask(detailTask)}
          onCopyLink={copyLink}
          onChangeStatus={changeStatus}
          onChangeAssignee={changeAssignee}
          onChangePriority={changePriority}
          onChangeDescription={changeDescription}
        />
      )}
    </div>
  );
}
