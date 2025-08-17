// minimal watcher with error callback + guard
import {
  collection, onSnapshot, orderBy, query,
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export function watchTasks(projectId, onChange) {
  if (!projectId) { console.warn("[tasks] start skipped: missing projectId"); return () => {}; }
  const col = collection(db, "projects", projectId, "tasks");
  const q = query(col, orderBy("order", "desc"));
  const unsub = onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.warn("[tasks watch error]", { projectId, code: err.code, msg: err.message });
      if (err.code === "permission-denied") toast.error("You don’t have permission to view tasks for this project.");
      else toast.error(`Tasks error: ${err.message}`);
    }
  );
  return unsub;
}

// ---- CRUD used by the store/Board ----
export async function createTask(projectId, data) {
  const col = collection(db, "projects", projectId, "tasks");
  await addDoc(col, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateTask(projectId, id, patch) {
  const ref = doc(db, "projects", projectId, "tasks", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function removeTask(projectId, id) {
  const ref = doc(db, "projects", projectId, "tasks", id);
  await deleteDoc(ref);
}
