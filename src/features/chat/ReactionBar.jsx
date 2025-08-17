import { useMemo } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../core/firebase";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";

const EMOJIS = ["👍","✅","❗","❤️","🎉"];

export default function ReactionBar({ pid, taskId, mid }) {
  const me = useAuthStore(s => s.user);
  const [counts, setCounts] = useState({}); // {emoji: number}
  const [mine, setMine] = useState({});     // {emoji: true}

  useEffect(() => {
    const col = collection(db, "projects", pid, "tasks", taskId, "messages", mid, "reactions");
    const unsub = onSnapshot(col, snap => {
      const c = {}, m = {};
      snap.forEach(d => {
        const { emoji, uid } = d.data();
        c[emoji] = (c[emoji] || 0) + 1;
        if (uid === me?.uid) m[emoji] = true;
      });
      setCounts(c); setMine(m);
    });
    return () => unsub();
  }, [pid, taskId, mid, me?.uid]);

  const toggle = async (emoji) => {
    if (!me) return;
    const rid = `${emoji}_${me.uid}`;
    const ref = doc(db, "projects", pid, "tasks", taskId, "messages", mid, "reactions", rid);
    if (mine[emoji]) await deleteDoc(ref);
    else await setDoc(ref, { emoji, uid: me.uid, createdAt: new Date() });
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => toggle(e)}
          className={`px-2 h-7 rounded border text-sm ${mine[e] ? "bg-gray-100" : "bg-white"} hover:bg-gray-50`}
          title={e}
        >
          <span className="mr-1">{e}</span>
          <span className="text-xs text-gray-600">{counts[e] || ""}</span>
        </button>
      ))}
    </div>
  );
}
