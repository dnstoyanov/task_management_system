import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../core/firebase";
import { useAuthStore } from "../../stores/useAuthStore";
import { MessageSquare, CornerDownRight, Pencil, Trash2, CheckCircle2 } from "lucide-react";

/* Small helpers */
const fmt = (ts) => (ts?.toDate?.() ? ts.toDate().toLocaleString() : "");

function Avatar({ nameOrEmail }) {
  const letter = (nameOrEmail || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
      {letter}
    </div>
  );
}

export default function TaskChat({
  pid,
  task,
  disabled = false,
  isOwner = false,
  className = "",
  onMessageCountChange, // NEW: report count up to parent
}) {
  const me = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [replies, setReplies] = useState({});
  const [replyDraft, setReplyDraft] = useState({});
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");

  const colMessages = useMemo(
    () => collection(db, "projects", pid, "tasks", task.id, "messages"),
    [pid, task.id]
  );

  /* Top level messages listener */
  useEffect(() => {
    const qMsgs = query(colMessages, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      qMsgs,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(arr);
        onMessageCountChange?.(arr.length);
      },
      (err) => console.error("[chat listener]", err)
    );
    return () => unsub();
  }, [colMessages, onMessageCountChange]);

  /* Replies listeners for each message (subscribe to all threads) */
  useEffect(() => {
    if (!messages.length) {
      setReplies({});
      return;
    }
    const unsubs = [];
    const byId = {};

    messages.forEach((m) => {
      const rCol = collection(db, "projects", pid, "tasks", task.id, "messages", m.id, "replies");
      const qR = query(rCol, orderBy("createdAt", "asc"));
      const u = onSnapshot(
        qR,
        (snap) => {
          byId[m.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setReplies((curr) => ({ ...curr, [m.id]: byId[m.id] }));
        },
        (err) => console.error("[replies listener]", err)
      );
      unsubs.push(u);
    });

    return () => unsubs.forEach((u) => u && u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, task.id, messages.map((m) => m.id).join("|")]);

  const canEditOrDelete = (uid) => !!me && (uid === me.uid || isOwner);

  async function send() {
    const t = text.trim();
    if (!t) return;
    try {
      await addDoc(colMessages, {
        uid: me.uid,
        author: me.displayName || me.email || me.uid,
        text: t,
        createdAt: serverTimestamp(),
        resolved: false,
      });
      setText("");
    } catch (e) {
      console.error("send message failed", e);
    }
  }

  async function sendReply(mid) {
    const t = (replyDraft[mid] || "").trim();
    if (!t) return;
    try {
      const rCol = collection(db, "projects", pid, "tasks", task.id, "messages", mid, "replies");
      await addDoc(rCol, {
        uid: me.uid,
        author: me.displayName || me.email || me.uid,
        text: t,
        createdAt: serverTimestamp(),
      });
      setReplyDraft((c) => ({ ...c, [mid]: "" }));
    } catch (e) {
      console.error("send reply failed", e);
    }
  }

  function beginEditMessage(m) {
    setEditing({ type: "message", mid: m.id });
    setEditText(m.text);
  }
  function beginEditReply(mid, r) {
    setEditing({ type: "reply", mid, rid: r.id });
    setEditText(r.text);
  }

  async function saveEdit() {
    const t = editText.trim();
    if (!t) return;
    try {
      if (editing.type === "message") {
        await updateDoc(
          doc(db, "projects", pid, "tasks", task.id, "messages", editing.mid),
          { text: t, editedAt: serverTimestamp() }
        );
      } else {
        await updateDoc(
          doc(db, "projects", pid, "tasks", task.id, "messages", editing.mid, "replies", editing.rid),
          { text: t, editedAt: serverTimestamp() }
        );
      }
      setEditing(null);
      setEditText("");
    } catch (e) {
      console.error("edit failed", e);
    }
  }

  async function removeMessage(m) {
    if (!window.confirm("Delete this comment (and its replies)?")) return;
    try {
      const rCol = collection(db, "projects", pid, "tasks", task.id, "messages", m.id, "replies");
      const rSnap = await getDocs(rCol);
      for (const r of rSnap.docs) await deleteDoc(r.ref);
      await deleteDoc(doc(db, "projects", pid, "tasks", task.id, "messages", m.id));
    } catch (e) {
      console.error("delete message failed", e);
    }
  }
  async function removeReply(mid, r) {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await deleteDoc(doc(db, "projects", pid, "tasks", task.id, "messages", mid, "replies", r.id));
    } catch (e) {
      console.error("delete reply failed", e);
    }
  }

  async function toggleResolve(m) {
    try {
      await updateDoc(
        doc(db, "projects", pid, "tasks", task.id, "messages", m.id),
        m.resolved
          ? { resolved: false }
          : { resolved: true, resolvedBy: me.uid, resolvedAt: serverTimestamp() }
      );
    } catch (e) {
      console.error("toggle resolve failed", e);
    }
  }

  return (
    <div className={`flex flex-col rounded border ${className}`}>
      {/* THREAD LIST (fills available height when parent gives h-full) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {!messages.length && (
          <p className="text-sm text-gray-400">No comments yet.</p>
        )}

        {messages.map((m) => {
          const editable = canEditOrDelete(m.uid) && !disabled;
          const mEditing = editing?.type === "message" && editing.mid === m.id;
          const threadReplies = replies[m.id] || [];

          return (
            <div key={m.id} className="rounded-lg border bg-gray-100">
              {/* Header row */}
              <div className="flex items-start gap-3 p-3 pb-2">
                <Avatar nameOrEmail={m.author || m.uid} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {m.author || m.uid}
                      </div>
                      <div className="text-xs text-gray-500">{fmt(m.createdAt)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.resolved && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 size={14} />
                          Resolved
                        </span>
                      )}
                      {!disabled && (
                        <div className="hidden sm:flex items-center gap-2">
                          {editable && !mEditing && (
                            <button
                              className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                              onClick={() => beginEditMessage(m)}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {editable && (
                            <button
                              className="text-xs px-2 py-0.5 border rounded text-red-600 hover:bg-red-50"
                              onClick={() => removeMessage(m)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                            onClick={() => toggleResolve(m)}
                          >
                            {m.resolved ? "Reopen" : "Resolve"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {mEditing ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 border rounded px-3 py-2 text-sm"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        autoFocus
                      />
                      <button className="px-3 py-2 rounded bg-black text-white" onClick={saveEdit}>
                        Save
                      </button>
                      <button
                        className="px-3 py-2 rounded border"
                        onClick={() => {
                          setEditing(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm whitespace-pre-wrap">{m.text}</p>
                  )}
                </div>
              </div>

              {/* Replies */}
              <div className="pl-10 pr-3 pb-3 space-y-3">
                {threadReplies.map((r) => {
                  const rEditable = canEditOrDelete(r.uid) && !disabled;
                  const rEditing =
                    editing?.type === "reply" && editing.mid === m.id && editing.rid === r.id;
                  return (
                    <div key={r.id} className="rounded border bg-white">
                      <div className="flex items-start gap-3 p-3">
                        <CornerDownRight size={16} className="mt-1 text-gray-400" />
                        <Avatar nameOrEmail={r.author || r.uid} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {r.author || r.uid}
                              </div>
                              <div className="text-xs text-gray-500">{fmt(r.createdAt)}</div>
                            </div>
                            {!disabled && rEditable && !rEditing && (
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                                  onClick={() => beginEditReply(m.id, r)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="text-xs px-2 py-0.5 border rounded text-red-600 hover:bg-red-50"
                                  onClick={() => removeReply(m.id, r)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>

                          {rEditing ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                autoFocus
                              />
                              <button
                                className="px-3 py-2 rounded bg-black text-white"
                                onClick={saveEdit}
                              >
                                Save
                              </button>
                              <button
                                className="px-3 py-2 rounded border"
                                onClick={() => {
                                  setEditing(null);
                                  setEditText("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm whitespace-pre-wrap">{r.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Reply composer */}
                {!disabled && (
                  <div className="flex items-center gap-2 pl-7">
                    <MessageSquare size={16} className="text-gray-400" />
                    <input
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="Write a reply…"
                      value={replyDraft[m.id] || ""}
                      onChange={(e) =>
                        setReplyDraft((c) => ({ ...c, [m.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && sendReply(m.id)}
                    />
                    <button
                      className="px-3 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-300"
                      disabled={!((replyDraft[m.id] || "").trim())}
                      onClick={() => sendReply(m.id)}
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW COMMENT COMPOSER */}
      <div className="p-3 border-t flex gap-2">
        <input
          disabled={disabled}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Write a comment…"
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
