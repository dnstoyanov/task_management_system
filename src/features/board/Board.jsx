// src/features/board/Board.jsx
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
import { handleFirestoreError, notify } from "../../components/toast";
import {
  notifyAssignment,
  notifyStatusChange,
  notifyPriorityChange,
} from "../../services/notification.service";

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

  // listeners
  useEffect(() => {
    if (!me || !projectId) return;
    start(projectId);
    return () => stop();
  }, [projectId, me, start, stop]);

  useEffect(() => {
    if (!me) return;
    const unsub = ProjectService.watchOne(projectId, async (p) => {
      setProject(p);
      if (!p) {
        setMembers([]);
        setOwnerProfile(null);
        return;
      }
      const profiles = await UserService.profiles(p.members || []);
      setMembers(profiles);
      setOwnerProfile(await UserService.profile(p.owner));
    });
    return () => unsub && unsub();
  }, [projectId, me]);

  const isOwner = !!(project && me && project.owner === me.uid);
  const isMemberMe = !!(project?.members || []).includes(me?.uid);

  // recipients helper (owner + assignee, excluding actor)
  const recipients = (assignee) => {
    const s = new Set();
    if (project?.owner) s.add(project.owner);
    if (assignee) s.add(assignee);
    if (me?.uid) s.delete(me.uid);
    return [...s];
  };

  // deep-link (?t=id)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tid = q.get("t");
    if (!tid) return;
    const t = tasks.find((x) => x.id === tid);
    if (t) setDetailTask(t);
  }, [location.search, tasks]);

  // derived buckets
  const byStatus = useMemo(() => {
    const list = tasks.map((t) => ({ ...t, status: normalizeStatus(t.status) }));
    return {
      backlog: list.filter((t) => t.status === "backlog").sort((a, b) => (a.order || 0) - (b.order || 0)),
      analyze: list.filter((t) => t.status === "analyze").sort((a, b) => (a.order || 0) - (b.order || 0)),
      develop: list.filter((t) => t.status === "develop").sort((a, b) => (a.order || 0) - (b.order || 0)),
      testing: list.filter((t) => t.status === "testing").sort((a, b) => (a.order || 0) - (b.order || 0)),
      done: list.filter((t) => t.status === "done").sort((a, b) => (a.order || 0) - (b.order || 0)),
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
    try {
      const { id, createdAt, updatedAt, ...rest } = t;
      await create(projectId, { ...rest, title: `${t.title} (copy)` });
      notify.success("Task cloned.");
    } catch (e) {
      handleFirestoreError(e, "Couldn’t clone the task.");
    }
  };

  // CRUD with toasts
  const saveForm = async (data) => {
    try {
      if (editModal?.id) {
        const prev = tasks.find((t) => t.id === editModal.id);
        await update(projectId, editModal.id, data);

        // notify on status / priority change when editing from modal
        if (prev) {
          const oldS = normalizeStatus(prev.status);
          const newS = normalizeStatus(data.status ?? prev.status);
          if (oldS !== newS) {
            await notifyStatusChange({
              pid: projectId,
              taskId: prev.id,
              oldStatus: oldS,
              newStatus: newS,
              toUids: recipients(prev.assignee),
              byUid: me.uid,
            });
          }
          const oldP = prev.priority || "med";
          const newP = data.priority ?? oldP;
          if (oldP !== newP) {
            await notifyPriorityChange({
              pid: projectId,
              taskId: prev.id,
              oldPriority: oldP,
              newPriority: newP,
              toUids: recipients(prev.assignee),
              byUid: me.uid,
            });
          }
        }
        notify.success("Task updated.");
      } else {
        await create(projectId, {
          ...data,
          status: editModal.status || "backlog",
          order: Date.now(),
        });
        notify.success("Task created.");
      }
      setEditModal(null);
    } catch (e) {
      handleFirestoreError(e, "Couldn’t save the task.");
    }
  };

  const deleteTask = async (task) => {
    try {
      await remove(projectId, task.id);
      notify.success("Task deleted.");
      if (detailTask?.id === task.id) closeDetail();
    } catch (e) {
      handleFirestoreError(e, "Couldn’t delete the task.");
    }
  };

  const toggleLock = async () => {
    try {
      if (!detailTask) return;
      await update(projectId, detailTask.id, { locked: !detailTask.locked });
      notify.success(detailTask.locked ? "Task unlocked." : "Task locked.");
    } catch (e) {
      handleFirestoreError(e, "Couldn’t change lock state.");
    }
  };

  const changeStatus = async (status) => {
    try {
      if (!detailTask) return;
      const oldS = normalizeStatus(detailTask.status);
      const newS = normalizeStatus(status);
      await update(projectId, detailTask.id, { status });
      if (oldS !== newS) {
        await notifyStatusChange({
          pid: projectId,
          taskId: detailTask.id,
          oldStatus: oldS,
          newStatus: newS,
          toUids: recipients(detailTask.assignee),
          byUid: me.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, "You can’t change the status.");
    }
  };

  const changeAssignee = async (assignee) => {
    try {
      if (!detailTask) return;
      const prev = detailTask.assignee || null;
      const next = assignee || null;
      await update(projectId, detailTask.id, { assignee: next });
      if (next && next !== prev && me?.uid) {
        await notifyAssignment({
          pid: projectId,
          taskId: detailTask.id,
          toUid: next,
          byUid: me.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, "You can’t change the assignee.");
    }
  };

  const changePriority = async (priority) => {
    try {
      if (!detailTask) return;
      const oldP = detailTask.priority || "med";
      const newP = priority;
      await update(projectId, detailTask.id, { priority });
      if (oldP !== newP) {
        await notifyPriorityChange({
          pid: projectId,
          taskId: detailTask.id,
          oldPriority: oldP,
          newPriority: newP,
          toUids: recipients(detailTask.assignee),
          byUid: me.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, "You can’t change the priority.");
    }
  };

  const changeDescription = async (description) => {
    try {
      if (!detailTask) return;
      await update(projectId, detailTask.id, { description });
      notify.success("Description updated.");
    } catch (e) {
      handleFirestoreError(e, "Couldn’t update the description.");
    }
  };

  const canChangePriority = (t) => !t.locked && isOwner;
  const canChangeStatus = (t) => !t.locked && (isOwner || me?.uid === t.assignee);
  const canChangeState = (t) => !t.locked && isOwner;

  const changePriorityQuick = async (priority, id) => {
    try {
      const prev = tasks.find((t) => t.id === id);
      const oldP = prev?.priority || "med";
      await update(projectId, id, { priority });
      if (prev && oldP !== priority) {
        await notifyPriorityChange({
          pid: projectId,
          taskId: id,
          oldPriority: oldP,
          newPriority: priority,
          toUids: recipients(prev.assignee),
          byUid: me.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, "You can’t change the priority.");
    }
  };

  const changeStatusQuick = async (status, id) => {
    try {
      const prev = tasks.find((t) => t.id === id);
      const oldS = normalizeStatus(prev?.status);
      const newS = normalizeStatus(status);
      await update(projectId, id, { status });
      if (prev && oldS !== newS) {
        await notifyStatusChange({
          pid: projectId,
          taskId: id,
          oldStatus: oldS,
          newStatus: newS,
          toUids: recipients(prev.assignee),
          byUid: me.uid,
        });
      }
    } catch (e) {
      handleFirestoreError(e, "You can’t move this task.");
    }
  };

  const changeState = async (state, id) => {
    try {
      await update(projectId, id, { state });
    } catch (e) {
      handleFirestoreError(e, "You can’t change the state.");
    }
  };

  const copyLink = async () => {
    if (!detailTask) return;
    const url = `${window.location.origin}/p/${projectId}?t=${detailTask.id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify.success("Link copied.");
    } catch {
      notify.info(url);
    }
  };

  // ---- DND ----
  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;
    const srcIdx = source.index;
    const dstIdx = destination.index;

    if (srcCol === dstCol && srcIdx === dstIdx) return;

    const moved =
      (byStatus[srcCol] || []).find((t, i) => i === srcIdx) ||
      tasks.find((t) => t.id === draggableId);
    if (!moved) return;

    try {
      if (srcCol !== dstCol) {
        await update(projectId, moved.id, {
          status: dstCol,
          order: Date.now(),
        });
        const oldS = normalizeStatus(moved.status);
        const newS = normalizeStatus(dstCol);
        if (oldS !== newS) {
          await notifyStatusChange({
            pid: projectId,
            taskId: moved.id,
            oldStatus: oldS,
            newStatus: newS,
            toUids: recipients(moved.assignee),
            byUid: me.uid,
          });
        }
        return;
      }

      const col = [...(byStatus[srcCol] || [])];
      const [item] = col.splice(srcIdx, 1);
      col.splice(dstIdx, 0, item);

      await Promise.all(
        col.map((t, i) =>
          update(projectId, t.id, { order: i + 1 }).catch((e) => {
            handleFirestoreError(e, "Couldn’t reorder tasks.");
          })
        )
      );
    } catch (e) {
      handleFirestoreError(e, "Drag operation failed.");
    }
  }

  if (!me) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          ["Backlog", "backlog", byStatus.backlog],
          ["Analyze", "analyze", byStatus.analyze],
          ["Develop", "develop", byStatus.develop],
          ["Testing", "testing", byStatus.testing],
          ["Done", "done", byStatus.done],
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
            onChangeState={(t, v) =>
              canChangeState(t)
                ? changeState(v, t.id)
                : notify.error("Only the owner can change state.")
            }
            onChangeStatus={(t, v) =>
              canChangeStatus(t)
                ? changeStatusQuick(v, t.id)
                : notify.error("Only the owner or assignee can change status.")
            }
            onChangePriority={(t, v) =>
              canChangePriority(t)
                ? changePriorityQuick(v, t.id)
                : notify.error("Only the owner can change priority.")
            }
          />
        ))}
      </div>

      {editModal && (
        <TaskModal
          initial={
            editModal.id
              ? editModal
              : { status: editModal.status || "backlog", state: "new" }
          }
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
