import { db } from "../firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, orderBy, query
} from "firebase/firestore";

export const TaskService = {
  watch(pid, cb) {
    const col = collection(db, "projects", pid, "tasks");
    // simple ordering to avoid composite index for now
    const q = query(col, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },
  create(pid, task) {
    const col = collection(db, "projects", pid, "tasks");
    const now = serverTimestamp();
    return addDoc(col, {
      title: task.title,
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "med",
      assignee: task.assignee || null,
      dueDate: task.dueDate || null,
      createdAt: now,
    });
  },
  update(pid, tid, patch) {
    return updateDoc(doc(db, "projects", pid, "tasks", tid), patch);
  },
  remove(pid, tid) {
    return deleteDoc(doc(db, "projects", pid, "tasks", tid));
  },
};
