import {
  addDoc, collection, collectionGroup, onSnapshot, orderBy, query, where,
  updateDoc, doc, serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";
import { db } from "../firebase";

// Map a collectionGroup doc back to its project id
const pidOf = (docSnap) => docSnap.ref.parent.parent.id;

export const NotificationService = {
  // Live read of my notifications (all projects)
  watchMine(uid, onChange) {
    if (!uid) return () => {};
    const q = query(
      collectionGroup(db, "notifications"),
      where("toUid", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        pid: pidOf(d),
        ...d.data(),
      }));
      onChange(list);
    });
  },

  // Create an "assignment" notification
  async createAssignment(projectId, { taskId, toUid, byUid }) {
    const col = collection(db, "projects", projectId, "notifications");
    await addDoc(col, {
      type: "assignment",
      taskId,
      toUid,
      byUid,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  // Create one "mention" notification
  async createMention(projectId, { taskId, toUid, byUid, messageId }) {
    const col = collection(db, "projects", projectId, "notifications");
    await addDoc(col, {
      type: "mention",
      taskId,
      toUid,
      byUid,
      messageId: messageId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  // Mark a single notification as read
  async markRead(pid, id, read = true) {
    await updateDoc(doc(db, "projects", pid, "notifications", id), { read });
  },

  // Mark all my unread notifications as read
  async markAllMineRead(uid) {
    const q = query(
      collectionGroup(db, "notifications"),
      where("toUid", "==", uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      const pid = pidOf(d);
      batch.update(doc(db, "projects", pid, "notifications", d.id), { read: true });
    });
    await batch.commit();
  },
};
