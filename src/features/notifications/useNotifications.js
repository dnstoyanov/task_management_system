import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { useAuthStore } from "../../stores/useAuthStore";
import { toast } from "react-toastify";

export function useNotifications() {
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState([]);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, "users", user.uid, "notifications");
    const q = query(col, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // show toasts for new (unread) after initial load
      if (!firstRun.current) {
        list.filter(n => !n.read).forEach(n => {
          toast.info(n.text || "New notification");
        });
      }
      firstRun.current = false;
      setItems(list);
    });
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = items.filter(n => !n.read).length;

  const markRead = async (nid) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "notifications", nid), { read: true });
  };
  const markAllRead = async () => {
    if (!user) return;
    await Promise.all(items.filter(n => !n.read).map(n =>
      updateDoc(doc(db, "users", user.uid, "notifications", n.id), { read: true })
    ));
  };

  return { items, unreadCount, markRead, markAllRead };
}
