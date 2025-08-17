// src/services/notification.service.js
// Idempotent writers + robust inbox watcher with automatic per-project fallback

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
  // We purposely rewrite createdAt & read for idempotent "latest event" behavior.
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

/* -------------------- READERS -------------------- */
/**
 * Primary watcher: collection-group on /notifications where toUid == uid
 */
function watchMineCG(uid, onChange, onError) {
  try {
    const q = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          pid: d.ref.parent.parent.id, // projects/{pid}/notifications/{id}
          ...d.data(),
        }));
        onChange(sortByTimeDesc(list));
      },
      (err) => {
        console.warn("[notifications] CG watcher error → falling back:", err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn("[notifications] CG watcher threw → falling back:", err);
    onError?.(err);
    return () => {};
  }
}

/**
 * Fallback watcher: watch projects I'm in, then each project's /notifications where toUid == uid.
 * This does NOT require any collection-group indexes and is very reliable.
 */
function watchMinePerProject(uid, onChange) {
  const projQ = query(collection(db, "projects"), where("members", "array-contains", uid));
  const perProjectUnsubs = new Map();
  let current = [];
  const push = () => onChange(sortByTimeDesc([...current]));

  function upsert(pid, docs) {
    current = current.filter((n) => n.pid !== pid).concat(docs.map((d) => ({ pid, ...d })));
    push();
  }

  function watchOne(pid) {
    const nq = query(collection(db, "projects", pid, "notifications"), where("toUid", "==", uid));
    const u = onSnapshot(
      nq,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        upsert(pid, rows);
      },
      (err) => {
        console.warn(`[notifications] watcher for project ${pid} failed:`, err);
      }
    );
    perProjectUnsubs.set(pid, u);
  }

  const unsubProjects = onSnapshot(
    projQ,
    (snap) => {
      const pids = new Set(snap.docs.map((d) => d.id));

      // Add missing watches
      pids.forEach((pid) => {
        if (!perProjectUnsubs.has(pid)) watchOne(pid);
      });

      // Remove no-longer-needed watches
      Array.from(perProjectUnsubs.keys()).forEach((pid) => {
        if (!pids.has(pid)) {
          try {
            perProjectUnsubs.get(pid)();
          } catch {}
          perProjectUnsubs.delete(pid);
          current = current.filter((n) => n.pid !== pid);
          push();
        }
      });
    },
    (err) => console.warn("[notifications] projects watcher failed:", err)
  );

  return () => {
    try {
      unsubProjects();
    } catch {}
    perProjectUnsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
    perProjectUnsubs.clear();
  };
}

/**
 * Public: start inbox watcher with auto-fallback
 */
export function watchMine(uid, onChange) {
  if (!uid) return () => {};
  let usingFallback = false;
  let unsub = watchMineCG(
    uid,
    onChange,
    () => {
      if (!usingFallback) {
        try {
          unsub && unsub();
        } catch {}
        usingFallback = true;
        unsub = watchMinePerProject(uid, onChange);
      }
    }
  );
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

/**
 * Mark all as read. Tries collection-group, then per-project fallback.
 */
export async function markAllMineRead(uid) {
  try {
    const cg = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
    const snap = await getDocs(cg);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      const pid = d.ref.parent.parent.id;
      batch.update(doc(db, "projects", pid, "notifications", d.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn("[notifications] markAll via CG failed → project fallback:", err);
    // fallback: iterate projects
    const projQ = query(collection(db, "projects"), where("members", "array-contains", uid));
    const projSnap = await getDocs(projQ);
    for (const p of projSnap.docs) {
      const pid = p.id;
      const nq = query(collection(db, "projects", pid, "notifications"), where("toUid", "==", uid));
      const ns = await getDocs(nq);
      if (ns.empty) continue;
      const batch = writeBatch(db);
      ns.docs.forEach((d) => {
        batch.update(doc(db, "projects", pid, "notifications", d.id), { read: true });
      });
      await batch.commit();
    }
  }
}

/**
 * Clear all (delete). Tries collection-group, then per-project fallback.
 */
export async function deleteAllMine(uid) {
  try {
    const cg = query(collectionGroup(db, "notifications"), where("toUid", "==", uid));
    const snap = await getDocs(cg);
    if (snap.empty) return;
    // Chunk writes to stay under 500/commit
    const docs = snap.docs.map((d) => ({
      pid: d.ref.parent.parent.id,
      id: d.id,
    }));
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach(({ pid, id }) =>
        batch.delete(doc(db, "projects", pid, "notifications", id))
      );
      await batch.commit();
    }
  } catch (err) {
    console.warn("[notifications] clear via CG failed → project fallback:", err);
    const projQ = query(collection(db, "projects"), where("members", "array-contains", uid));
    const projSnap = await getDocs(projQ);
    for (const p of projSnap.docs) {
      const pid = p.id;
      const nq = query(collection(db, "projects", pid, "notifications"), where("toUid", "==", uid));
      const ns = await getDocs(nq);
      if (ns.empty) continue;
      for (let i = 0; i < ns.docs.length; i += 400) {
        const batch = writeBatch(db);
        ns.docs.slice(i, i + 400).forEach((d) =>
          batch.delete(doc(db, "projects", pid, "notifications", d.id))
        );
        await batch.commit();
      }
    }
  }
}
