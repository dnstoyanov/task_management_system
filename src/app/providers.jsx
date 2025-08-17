import { useEffect } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useProjectStore } from "../stores/project.store";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../core/firebase";
import { toast } from "react-toastify";

export function Providers({ children }) {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const startPublic = useProjectStore((s) => s.startPublic);
  const stop = useProjectStore((s) => s.stop);

  useEffect(() => init(), [init]);
  useEffect(() => {
    if (user) startPublic();
    else stop();
  }, [user, startPublic, stop]);

  // in-app notifications (mentions)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type === "added") {
          const n = ch.doc.data();
          toast.info(n.toastText || "🔔 You were mentioned");
        }
      });
    });
    return () => unsub();
  }, [user]);

  return children;
}
