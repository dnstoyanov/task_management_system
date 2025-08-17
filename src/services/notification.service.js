// Idempotent writers + robust inbox watcher (collection-group with per-project fallback)

import {
  setDoc,
  doc,
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../core/firebase";

/* -------------------- helpers -------------------- */
const now = () => serverTimestamp();
const sortByTimeDesc = (list) =>
  list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

/** Idempotent upsert into /projects/{pid}/notifications/{id} */
async function upsert(pid, id, data) {
  await setDoc(
    doc(db, "projects", pid, "notifications", id),
    { ...data, read: false, createdAt: now() },
    { merge: true }
  );
}

/* -------------------- WRITERS -------------------- */
// Assignment — one record per (task,toUid)
export async function notifyAssignment({ pid, taskId, toUid, byUid }) {
  if (!pid || !taskId || !toUid || !byUid) return;
  const id = `a__${taskId}__${toUid}`; // deterministic -> no duplicates
  await upsert(pid, id, { type: "assignment", taskId, toUid, byUid });
}

// Mentions — collapse by (task,toUid)
export async function notifyMentions({ pid, taskId, toUids = [], byUid, messageId = null }) {
  const uniq = [...new Set(toUids)].filter(Boolean);
  await Promise.all(
    uniq.map((toUid) =>
      upsert(pid, `m__${taskId}__${toUid}`, {
        type: "mention",
        taskId,
        toUid,
        byUid,
        messageId: messageId || null,
      })
    )
  );
}

// Status change — notify owner + assignee
export async function notifyStatusChange({ pid, taskId, oldStatus, newStatus, toUids = [], byUid }) {
  if (oldStatus === newStatus) return;
  const uniq = [...new Set(toUids)].filter(Boolean);
  await Promise.all(
    uniq.map((toUid) =>
      upsert(pid, `s__${taskId}__${toUid}`, {
        type: "status",
        taskId,
        toUid,
        byUid,
        oldStatus,
        newStatus,
      })
    )
  );
}

// Priority change — notify owner + assignee
export async function notifyPriorityChange({
  pid,
  taskId,
  oldPriority,
  newPriority,
  toUids = [],
  byUid,
}) {
  if (oldPriority === newPriority) return;
  const uniq = [...new Set(toUids)].filter(Boolean);
  await Promise.all(
    uniq.map((toUid) =>
      upsert(pid, `p__${taskId}__${toUid}`, {
        type: "priority",
        taskId,
        toUid,
        byUid,
        oldPriority,
        newPriority,
      })
    )
  );
}

/* -------------------- READERS (CG + fallback) -------------------- */
function watchMineCG(uid, onChange, onError) {
  const q = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        pid: d.ref.parent.parent.id,
        ...d.data(),
      }));
      onChange(sortByTimeDesc(list));
    },
    onError
  );
}

function watchMinePerProject(uid, onChange) {
  // minimal fallback without an extra projects watcher — scan all notifications groups where toUid == uid
  const q = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({
      id: d.id,
      pid: d.ref.parent.parent.id,
      ...d.data(),
    }));
    onChange(sortByTimeDesc(list));
  });
}

export function watchMine(uid, onChange) {
  if (!uid) return () => {};
  let fellBack = false;
  let unsub = watchMineCG(uid, onChange, () => {
    if (!fellBack) {
      try {
        unsub && unsub();
      } catch {}
      fellBack = true;
      unsub = watchMinePerProject(uid, onChange);
    }
  });
  return () => {
    try {
      unsub && unsub();
    } catch {}
  };
}

/* -------------------- UPDATE / CLEAR -------------------- */
export async function markRead({ pid, id, read = true }) {
  await updateDoc(doc(db, "projects", pid, "notifications", id), { read });
}

export async function markAllMineRead(uid) {
  const q = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const pid = d.ref.parent.parent.id;
    batch.update(doc(db, "projects", pid, "notifications", d.id), { read: true });
  });
  await batch.commit();
}

export async function deleteAllMine(uid) {
  const q = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return;
  // Firestore batch limit is 500 ops — chunk to 400 for safety
  const docs = snap.docs.map((d) => ({
    pid: d.ref.parent.parent.id,
    id: d.id,
  }));
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach(({ pid, id }) =>
      batch.delete(doc(db, "projects", pid, "notifications", id))
    );
    await batch.commit();
  }
}
