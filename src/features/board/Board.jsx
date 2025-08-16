import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DragDropContext } from "@hello-pangea/dnd";
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

  // wait for auth before starting listeners
  useEffect(() => {
    if (!me) return;
    start(projectId);
    return () => stop();
  }, [projectId, me, start, stop]);

  useEffect(() => {
    if (!me) return;
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

  // deep-link (?t=taskId)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tid = q.get("t");
    if (!tid) return;
    const t = tasks.find((x) => x.id === tid);
    if (t) setDetailTask(t);
  }, [location.search, tasks]);

  // group tasks by normalized status
  const byStatus = useMemo(() => {
    const list = tasks.map((t) => ({ ...t, status: normalizeStatus(t.status) }));
    return {
      backlog: list.filter((t) => t.status === "backlog").sort((a,b)=>(a.order??0)-(b.order??0)),
      analyze: list.filter((t) => t.status === "analyze").sort((a,b)=>(a.order??0)-(b.order??0)),
      develop: list.filter((t) => t.status === "develop").sort((a,b)=>(a.order??0)-(b.order??0)),
      testing: list.filter((t) => t.status === "testing").sort((a,b)=>(a.order??0)-(b.order??0)),
      done:    list.filter((t) => t.status === "done").sort((a,b)=>(a.order??0)-(b.order??0)),
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
    await create(projectId, { ...rest, title: `${t.title} (copy)`, order: Date.now() });
  };

  // CRUD helpers
  const saveForm = async (data) => {
    if (editModal?.id) await update(projectId, editModal.id, data);
    else await create(projectId, { ...data, status: editModal.status || "backlog", order: Date.now() });
    setEditModal(null);
  };
  const deleteTask = async (task) => { await remove(projectId, task.id); if (detailTask?.id === task.id) closeDetail(); };
  const toggleLock = async () => { if (!detailTask) return; await update(projectId, detailTask.id, { locked: !detailTask.locked }); };
  const changeStatus = async (status) => { if (!detailTask) return; await update(projectId, detailTask.id, { status }); };
  const changeAssignee = async (assignee) => { if (!detailTask) return; await update(projectId, detailTask.id, { assignee: assignee || null }); };
  const changePriority = async (priority) => { if (!detailTask) return; await update(projectId, detailTask.id, { priority }); };
  const changeDescription = async (description) => { if (!detailTask) return; await update(projectId, detailTask.id, { description }); };

  const changePriorityQuick = async (priority, id) => { await update(projectId, id, { priority }); };

  const changeStatusQuick = async (status, id) => {
    try { await update(projectId, id, { status }); }
    catch (e) { console.error("[status update failed]", e); }
  };

  const changeState = async (state, id) => {
    try { await update(projectId, id, { state }); }
    catch (e) { console.error("[state update failed]", e); }
  };

  const copyLink = async () => {
    if (!detailTask) return;
    const url = `${window.location.origin}/p/${projectId}?t=${detailTask.id}`;
    try { await navigator.clipboard.writeText(url); alert("Link copied"); } catch { alert(url); }
  };

  const canChangeStatus = (t) => !t.locked && (isOwner || me?.uid === t.assignee);
  const canChangeState  = (t) => !t.locked && isOwner;
  const canDragOrChangeStatus = (t) => canChangeStatus(t); // for Column/Draggable

  // --- DND: compute a nice "order" number based on neighbors
  function calcNewOrder(destList, insertIndex) {
    const prev = destList[insertIndex - 1]?.order;
    const next = destList[insertIndex]?.order;
    const now = Date.now();
    if (prev != null && next != null) return (prev + next) / 2;
    if (prev != null) return prev + 1;
    if (next != null) return next - 1;
    return now; // empty list fallback
  }

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId;      // "backlog" | "analyze" | ...
    const to   = destination.droppableId; // same
    const samePlace = from === to && destination.index === source.index;
    if (samePlace) return;

    const moved = tasks.find(t => t.id === draggableId);
    if (!moved) return;

    // permission: only owner or assignee, and not locked (unless owner)
    const allowed = !moved.locked ? (isOwner || me?.uid === moved.assignee) : isOwner;
    if (!allowed) return alert("You can't move this task.");

    // build destination list preview (with moved task in it) to compute order
    const lists = {
      backlog: [...byStatus.backlog],
      analyze: [...byStatus.analyze],
      develop: [...byStatus.develop],
      testing: [...byStatus.testing],
      done:    [...byStatus.done],
    };

    // remove from source list
    lists[from] = lists[from].filter(t => t.id !== draggableId);
    // insert into destination (we don't know order yet)
    lists[to].splice(destination.index, 0, moved);

    const newOrder = calcNewOrder(lists[to], destination.index);
    const payload = { order: newOrder };
    if (from !== to) payload.status = to;

    try {
      await update(projectId, draggableId, payload);
    } catch (e) {
      console.error("Drag update failed", e);
    }
  };

  if (!me) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
            canDragOrChangeStatus={canDragOrChangeStatus}
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
              (!t.locked && isOwner) ? changePriorityQuick(v, t.id) : alert("Only the owner can change priority.")
            }
          />
        ))}
      </div>

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
    </DragDropContext>
  );
}
