import { db } from "../firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, orderBy, query
} from "firebase/firestore";

export const TaskService = {
  watch(pid, cb) {
    const col = collection(db, "projects", pid, "tasks");
    const q = query(col, orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("[tasks listener error]", err)
    );

  },
  create(pid, task) {
    const col = collection(db, "projects", pid, "tasks");
    const now = serverTimestamp();
    return addDoc(col, {
      title: task.title,
      description: task.description || "",
      status: task.status || "backlog",
      state:  task.state  || "new", 
      priority: task.priority || "med",
      assignee: task.assignee || null,
      locked: false,
      createdAt: now,
      updatedAt: now,
    });
  },
  update(pid, tid, patch) {
    return updateDoc(doc(db, "projects", pid, "tasks", tid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  },
  remove(pid, tid) {
    return deleteDoc(doc(db, "projects", pid, "tasks", tid));
  },
};
