import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { useAuthStore } from "../../stores/useAuthStore";

export default function TaskChat({ pid, task, isOwner = false, disabled = false }) {
  const me = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const colRef = collection(db, "projects", pid, "tasks", task.id, "messages");

  useEffect(() => {
    const q = query(colRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("[chat listener]", err)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, task.id]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    try {
      await addDoc(colRef, {
        uid: me.uid,
        author: me.displayName || me.email || me.uid, // convenience for display
        text: t,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (e) {
      console.error("send message failed", e);
    }
  }

  function beginEdit(m) {
    setEditingId(m.id);
    setEditText(m.text);
  }

  async function saveEdit(id) {
    const t = editText.trim();
    if (!t) return;
    try {
      await updateDoc(doc(db, "projects", pid, "tasks", task.id, "messages", id), {
        text: t,
        editedAt: serverTimestamp(),
      });
      setEditingId(null);
      setEditText("");
    } catch (e) {
      console.error("edit message failed", e);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "projects", pid, "tasks", task.id, "messages", id));
    } catch (e) {
      console.error("delete message failed", e);
    }
  }

  const canEditOrDelete = (m) => m.uid === me?.uid || isOwner;

  return (
    <div className="rounded border">
      <div className="max-h-64 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => {
          const ts =
            m.createdAt?.toDate?.() ? m.createdAt.toDate().toLocaleString() : "";
          const edited = !!m.editedAt;

          return (
            <div key={m.id} className="group">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-medium">
                  {m.author || m.uid}
                  <span className="ml-2 text-xs text-gray-400">{ts}</span>
                  {edited && <span className="ml-1 text-xs text-gray-400">(edited)</span>}
                </div>

                {canEditOrDelete(m) && !disabled && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    {editingId !== m.id && (
                      <button
                        className="text-xs px-2 py-0.5 border rounded"
                        onClick={() => beginEdit(m)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className="text-xs px-2 py-0.5 border rounded text-red-600"
                      onClick={() => remove(m.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingId === m.id ? (
                <div className="mt-1 flex gap-2">
                  <input
                    className="flex-1 border rounded px-2 py-1"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                    autoFocus
                  />
                  <button className="px-3 py-1 rounded bg-black text-white" onClick={() => saveEdit(m.id)}>
                    Save
                  </button>
                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => { setEditingId(null); setEditText(""); }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap mt-1">{m.text}</p>
              )}
            </div>
          );
        })}

        {!messages.length && <p className="text-sm text-gray-400">No comments yet.</p>}
      </div>

      {/* composer */}
      <div className="p-3 border-t flex gap-2">
        <input
          disabled={disabled}
          className="flex-1 border rounded px-2 py-2"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !disabled && send()}
        />
        <button
          disabled={disabled || !text.trim()}
          className="px-3 py-2 rounded bg-indigo-600 disabled:bg-gray-200 text-white"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}
