import { db } from "../firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, getDoc
} from "firebase/firestore";

const col = collection(db, "projects");

export const ProjectService = {
  watchAll(cb) {
    const q = query(col, orderBy("createdAt","desc"));
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  },
  watchOne(pid, cb) {
    return onSnapshot(doc(db, "projects", pid), (d) => cb(d.exists() ? { id:d.id, ...d.data() } : null));
  },
  async get(pid) { const s = await getDoc(doc(db, "projects", pid)); return s.exists() ? { id:s.id, ...s.data() } : null; },
  async create({ name, uid }) {
    return addDoc(col, { name, owner: uid, members:[uid], createdAt: serverTimestamp() });
  },
  async rename(id, name) { return updateDoc(doc(db, "projects", id), { name }); },
  async remove(id) { return deleteDoc(doc(db, "projects", id)); },

  // members
  async addMemberByUid(pid, uid) { return updateDoc(doc(db,"projects",pid), { members: arrayUnion(uid) }); },
  async removeMemberByUid(pid, uid) { return updateDoc(doc(db,"projects",pid), { members: arrayRemove(uid) }); },

  // ownership
  async transferOwner(pid, newOwnerUid) {
    // ensure they will be a member too
    await updateDoc(doc(db,"projects",pid), { owner: newOwnerUid, members: arrayUnion(newOwnerUid) });
  },
};
