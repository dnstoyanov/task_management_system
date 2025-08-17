// Works with collection-group AND falls back to per-project watchers.
import {
  addDoc, collection, collectionGroup, onSnapshot, query, where,
  updateDoc, doc, serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";
import { db } from "../core/firebase";

export async function notifyAssignment({ pid, taskId, toUid, byUid }) {
  const col = collection(db, "projects", pid, "notifications");
  await addDoc(col, { type: "assignment", taskId, toUid, byUid, read: false, createdAt: serverTimestamp() });
}
export async function notifyMentions({ pid, taskId, toUids = [], byUid, messageId = null }) {
  const col = collection(db, "projects", pid, "notifications");
  const uniq = [...new Set(toUids)];
  await Promise.all(
    uniq.map((toUid) =>
      addDoc(col, { type: "mention", taskId, toUid, byUid, messageId, read: false, createdAt: serverTimestamp() })
    )
  );
}

// ----- READERS -----
function sortByTimeDesc(list) {
  return list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

// Primary: collection-group
function watchMineCG(uid, onChange, onError) {
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
    onError
  );
}

// Fallback: watch projects I’m in, then each /notifications filtered by toUid
function watchMinePerProject(uid, onChange) {
  const projQ = query(collection(db, "projects"), where("members", "array-contains", uid));
  const perProjUnsubs = new Map();
  let current = [];

  const push = () => onChange(sortByTimeDesc([...current]));

  function upsert(pid, docs) {
    // remove old for pid, add new
    current = current.filter((n) => n.pid !== pid).concat(docs.map((d) => ({ pid, ...d })));
    push();
  }

  function watchOneProject(pid) {
    const notifQ = query(collection(db, "projects", pid, "notifications"), where("toUid", "==", uid));
    const unsub = onSnapshot(notifQ, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      upsert(pid, docs);
    });
    perProjUnsubs.set(pid, unsub);
  }

  const unsubProjects = onSnapshot(projQ, (snap) => {
    const pids = new Set(snap.docs.map((d) => d.id));
    // add new watches
    pids.forEach((pid) => { if (!perProjUnsubs.has(pid)) watchOneProject(pid); });
    // remove closed
    Array.from(perProjUnsubs.keys()).forEach((pid) => {
      if (!pids.has(pid)) { perProjUnsubs.get(pid)(); perProjUnsubs.delete(pid); }
    });
  });

  return () => {
    try { unsubProjects(); } catch {}
    perProjUnsubs.forEach((u) => { try { u(); } catch {} });
    perProjUnsubs.clear();
  };
}

// Public API: try CG, fall back on any error
export function watchMine(uid, onChange) {
  if (!uid) return () => {};
  let usingFallback = false;
  let unsub = watchMineCG(
    uid,
    onChange,
    () => {
      // permission/index/etc — switch to fallback
      if (!usingFallback) {
        try { unsub && unsub(); } catch {}
        usingFallback = true;
        unsub = watchMinePerProject(uid, onChange);
      }
    }
  );
  return () => { try { unsub && unsub(); } catch {} };
}

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
