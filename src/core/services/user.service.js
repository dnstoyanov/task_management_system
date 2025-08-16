import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

export const UserService = {
  async byEmail(email) {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  },
  async profile(uid) {
    const s = await getDoc(doc(db, "users", uid));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },
  async profiles(uids = []) {
    const results = await Promise.all(uids.map((u) => this.profile(u)));
    return results.filter(Boolean);
  },
};
