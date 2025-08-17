// src/core/services/task.service.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/** Utility: safe JSON clone for console output */
function j(x) {
  try { return JSON.parse(JSON.stringify(x)); } catch { return x; }
}

/** ------------------------------------------------------------------ */
/** Watcher                                                            */
/** ------------------------------------------------------------------ */
export function watchTasks(projectId, onChange, onError) {
  if (!projectId) return () => {};
  const col = collection(db, "projects", projectId, "tasks");
  const q = query(col, orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.warn("[tasks watch error]", err);
      onError?.(err);
    }
  );
}

/** ------------------------------------------------------------------ */
/** Helpers                                                            */
/** ------------------------------------------------------------------ */
const WRITEABLE_KEYS = new Set([
  "title",
  "description",
  "status",
  "order",
  "state",
  "priority",
  "assignee",
  "locked",
]);

function sanitizePatch(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (WRITEABLE_KEYS.has(k)) out[k] = v;
  }
  return out;
}

/** Compute changed keys the same way our client understands them */
function changedKeys(cur, next) {
  const keys = new Set([...Object.keys(cur || {}), ...Object.keys(next || {})]);
  const diff = [];
  for (const k of keys) {
    // compare loosely for simple primitives we use here
    if ((cur ?? {})[k] !== (next ?? {})[k]) diff.push(k);
  }
  return diff.sort();
}

/** Pretty-print whether a set of keys match the rules' whitelists */
function classifyChange(keys) {
  const k = [...keys].sort().join(",");
  const onlyStatus =
    k === "status" ||
    k === "status,updatedAt" ||
    k === "status,updatedBy" ||
    k === "status,updatedAt,updatedBy";

  const onlyOrder =
    k === "order" ||
    k === "order,updatedAt" ||
    k === "order,updatedBy" ||
    k === "order,updatedAt,updatedBy";

  const onlyStatusAndOrder =
    k === "order,status" ||
    k === "order,status,updatedAt" ||
    k === "order,status,updatedBy" ||
    k === "order,status,updatedAt,updatedBy";

  const onlyMeta =
    k === "updatedAt" ||
    k === "updatedBy" ||
    k === "updatedAt,updatedBy";

  const onlyText =
    k === "description" ||
    k === "title" ||
    k === "description,title" ||
    k === "description,updatedAt" ||
    k === "title,updatedAt" ||
    k === "description,title,updatedAt" ||
    k === "description,updatedBy" ||
    k === "title,updatedBy" ||
    k === "description,title,updatedBy" ||
    k === "description,title,updatedAt,updatedBy" ||
    k === "description,updatedAt,updatedBy" ||
    k === "title,updatedAt,updatedBy";

  return { onlyStatus, onlyOrder, onlyStatusAndOrder, onlyMeta, onlyText };
}

/** ------------------------------------------------------------------ */
/** CRUD                                                               */
/** ------------------------------------------------------------------ */
export async function createTask(projectId, data, byUid) {
  const col = collection(db, "projects", projectId, "tasks");
  const payload = sanitizePatch(data);
  payload.createdAt = serverTimestamp();
  if (byUid) payload.createdBy = byUid;
  if (typeof payload.order !== "number") payload.order = Date.now();
  await addDoc(col, payload);
}

export async function updateTask(projectId, taskId, patch, byUid) {
  const ref = doc(db, "projects", projectId, "tasks", taskId);
  const projectRef = doc(db, "projects", projectId);

  const clean = sanitizePatch(patch);

  // ---- Pre-read current task + project so we can log what the rules will see
  let cur = {};
  let project = {};
  try {
    const [taskSnap, projSnap] = await Promise.all([getDoc(ref), getDoc(projectRef)]);
    cur = taskSnap.exists() ? taskSnap.data() : {};
    project = projSnap.exists() ? projSnap.data() : {};
  } catch (e) {
    console.warn("[task.update] pre-read failed; proceeding", e?.code || e);
  }

  // Remove keys that don't actually change values (no-op avoidance)
  let meaningful = false;
  for (const k of Object.keys(clean)) {
    if (clean[k] === cur[k]) delete clean[k];
  }
  meaningful = Object.keys(clean).length > 0;

  // Add metadata **after** no-op removal
  if (meaningful) {
    clean.updatedAt = serverTimestamp();
    if (byUid) clean.updatedBy = byUid;
  } else {
    console.debug("[task.update] no-op (same values) – skipping write", {
      projectId,
      taskId,
      actor: byUid,
      currentStatus: cur.status,
      attemptedPatch: j(patch),
    });
    return;
  }

  // Compute the keys the rules will see as changed
  const after = { ...cur, ...clean };
  const keys = changedKeys(cur, after);
  const cls = classifyChange(keys);

  // Derive "rule booleans" so we can see which branch should pass
  const actorIsOwner = byUid && project?.owner === byUid;
  // We don't know token.email here, so only the UID branch of actorIsAssignee:
  const actorIsAssigneeUid = byUid && cur?.assignee === byUid;
  const taskLocked = cur?.locked === true;

  console.log("[task.update:attempt]", {
    projectId,
    taskId,
    actor: byUid,
    actorIsOwner,
    actorIsAssigneeUid,
    taskLocked,
    projectOwner: project?.owner || null,
    projectMembers: j(project?.members || []),
    current: {
      status: cur?.status ?? null,
      order: cur?.order ?? null,
      assignee: cur?.assignee ?? null,
      priority: cur?.priority ?? null,
    },
    patch: j(clean),
    changedKeys: keys,
    class: cls,
  });

  try {
    await updateDoc(ref, clean);
    console.log("[task.update:ok]", { projectId, taskId, applied: j(clean) });
  } catch (e) {
    console.error("[task.update:denied]", {
      projectId,
      taskId,
      code: e?.code,
      message: e?.message,
      actor: byUid,
      actorIsOwner,
      actorIsAssigneeUid,
      taskLocked,
      changedKeys: keys,
      class: cls,
      current: j(cur),
      patch: j(clean),
    });
    throw e;
  }
}

export async function deleteTask(projectId, taskId) {
  const ref = doc(db, "projects", projectId, "tasks", taskId);
  await deleteDoc(ref);
}
