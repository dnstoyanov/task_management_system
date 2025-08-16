import { db } from "../firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "firebase/firestore";

const col = collection(db, "projects");

export const ProjectService = {
  watchByUser(uid, cb) {
    const q = query(col, where("members", "array-contains", uid), orderBy("createdAt","desc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  },
  async create({ name, uid }) {
    return addDoc(col, { name, owner: uid, members:[uid], createdAt: serverTimestamp() });
  },
  async rename(id, name) { return updateDoc(doc(db, "projects", id), { name }); },
  async remove(id) { return deleteDoc(doc(db, "projects", id)); },
};
