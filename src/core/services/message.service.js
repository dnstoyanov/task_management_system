import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export const MessageService = {
  watch(pid, tid, cb) {
    const q = query(collection(db,"projects",pid,"tasks",tid,"messages"), orderBy("createdAt","asc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map(d=>({ id:d.id, ...d.data() }))));
  },
  send(pid, tid, { uid, text }) {
    return addDoc(collection(db,"projects",pid,"tasks",tid,"messages"), {
      uid, text, createdAt: serverTimestamp()
    });
  }
};
