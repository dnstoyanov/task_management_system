// src/features/chat/TaskChat.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "react-toastify";
import { notifyMentions } from "../../services/notification.service";
import { CornerDownRight, Pencil, Trash2, CheckCircle2 } from "lucide-react";

/* small helpers */
const fmt = (ts) => (ts?.toDate?.() ? ts.toDate().toLocaleString() : "");
function Avatar({ nameOrEmail = "?" }) {
  const letter = (nameOrEmail || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
      {letter || "?"}
    </div>
  );
}
function renderWithMentions(text) {
  const parts = text.split(/(@[^\s]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-blue-600 underline">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function TaskChat({
  pid,
  task,
  members = [], // [{id, displayName, email}]
  disabled = false,
  isOwner = false,
}) {
  const me = useAuthStore((s) => s.user);

  // --- data
  const [messages, setMessages] = useState([]);
  const [replies, setReplies] = useState({}); // {mid: []}
  const [draft, setDraft] = useState({}); // {mid or 'new': text}
  const [editing, setEditing] = useState(null); // {type:'message'|'reply', mid, rid?}
  const [editText, setEditText] = useState("");

  /* mentions state */
  const [mention, setMention] = useState({ key: null, query: "" });
  const mentionBoxRef = useRef(null);

  const colMessages = useMemo(
    () => collection(db, "projects", pid, "tasks", task.id, "messages"),
    [pid, task.id]
  );

  // watch messages
  useEffect(() => {
    const qMsgs = query(colMessages, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(qMsgs, (snap) =>
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [colMessages]);

  // watch replies per message
  useEffect(() => {
    const unsubs = [];
    messages.forEach((m) => {
      const rCol = collection(db, "projects", pid, "tasks", task.id, "messages", m.id, "replies");
      const u = onSnapshot(query(rCol, orderBy("createdAt", "asc")), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReplies((curr) => ({ ...curr, [m.id]: list }));
      });
      unsubs.push(u);
    });
    return () => unsubs.forEach((u) => u && u());
  }, [pid, task.id, messages.map((m) => m.id).join("|")]);

  /* permissions */
  const canEditOrDelete = (uid) => !!me && (uid === me.uid || isOwner);

  /* -------- mentions: lookup + extractors -------- */
  const memberLookup = useMemo(() => {
    const m = new Map();
    (members || []).forEach((u) => {
      const email = (u.email || "").toLowerCase();
      const handle = email.split("@")[0];
      if (email) m.set(email, u.id);
      if (handle) m.set(handle, u.id);
      const dn = (u.displayName || "").toLowerCase().replace(/\s+/g, "");
      if (dn) m.set(dn, u.id);
    });
    return m;
  }, [members]);

  function mentionedUidsFrom(text) {
    const ids = new Set();

    // @email
    for (const m of text.matchAll(/@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/g)) {
      const key = m[1].toLowerCase();
      if (memberLookup.has(key)) ids.add(memberLookup.get(key));
    }
    // @handle
    for (const m of text.matchAll(/@([A-Za-z0-9._-]+)/g)) {
      const key = m[1].toLowerCase();
      if (memberLookup.has(key)) ids.add(memberLookup.get(key));
    }

    if (ids.has(me?.uid)) ids.delete(me.uid); // no self-mentions
    return [...ids];
  }

  const mentionCandidates = useMemo(() => {
    const q = (mention.query || "").toLowerCase();
    if (!mention.key || !q) return [];
    return members
      .filter(
        (m) =>
          (m.email || "").toLowerCase().includes(q) ||
          (m.displayName || "").toLowerCase().replace(/\s+/g, "").includes(q)
      )
      .slice(0, 6);
  }, [mention, members]);

  function handleDraftChange(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    const tail = value.slice(0, value.selectionEnd ?? value.length) || value;
    const m = tail.match(/@([^\s@]*)$/);
    setMention(m ? { key, query: m[1] } : { key: null, query: "" });
  }

  function insertMention(key, email) {
    setDraft((d) => {
      const v = d[key] || "";
      const newV = v.replace(/@([^\s@]*)$/, `@${email}`);
      return { ...d, [key]: newV };
    });
    setMention({ key: null, query: "" });
  }

  /* ---------- CRUD ---------- */

  async function send() {
    const key = "new";
    const t = (draft[key] || "").trim();
    if (!t) return;
    try {
      const ref = await addDoc(colMessages, {
        uid: me.uid,
        author: me.displayName || me.email || me.uid,
        text: t,
        createdAt: serverTimestamp(),
        resolved: false,
      });

      // notifications for mentions
      const toUids = mentionedUidsFrom(t);
      if (toUids.length) {
        await notifyMentions({ pid, taskId: task.id, toUids, byUid: me.uid, messageId: ref.id });
      }

      setDraft((d) => ({ ...d, new: "" }));
    } catch (e) {
      toast.error(e.message || "Failed to send message");
      console.error(e);
    }
  }

  async function toggleResolve(m) {
    try {
      await updateDoc(doc(db, "projects", pid, "tasks", task.id, "messages", m.id), {
        resolved: !m.resolved,
      });
    } catch (e) {
      toast.error(e.message || "Failed to toggle");
      console.error(e);
    }
  }

  async function sendReply(mid) {
    const key = mid;
    const t = (draft[key] || "").trim();
    if (!t) return;
    try {
      const rCol = collection(db, "projects", pid, "tasks", task.id, "messages", mid, "replies");
      await addDoc(rCol, {
        uid: me.uid,
        author: me.displayName || me.email || me.uid,
        text: t,
        createdAt: serverTimestamp(),
      });

      const toUids = mentionedUidsFrom(t);
      if (toUids.length) {
        await notifyMentions({ pid, taskId: task.id, toUids, byUid: me.uid });
      }

      setDraft((d) => ({ ...d, [key]: "" }));
    } catch (e) {
      toast.error(e.message || "Failed to send reply");
      console.error(e);
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
    try {
      if (editing?.type === "message") {
        await updateDoc(doc(db, "projects", pid, "tasks", task.id, "messages", editing.mid), {
          text: editText,
        });
      } else if (editing?.type === "reply") {
        await updateDoc(
          doc(db, "projects", pid, "tasks", task.id, "messages", editing.mid, "replies", editing.rid),
          { text: editText }
        );
      }
      setEditing(null);
      setEditText("");
    } catch (e) {
      toast.error(e.message || "Failed to save edit");
      console.error(e);
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
      toast.error(e.message || "Failed to delete");
      console.error(e);
    }
  }
  async function removeReply(mid, r) {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await deleteDoc(doc(db, "projects", pid, "tasks", task.id, "messages", mid, "replies", r.id));
    } catch (e) {
      toast.error(e.message || "Failed to delete");
      console.error(e);
    }
  }

  return (
    <div className="p-2 rounded border overflow-hidden bg-white">
      {/* THREAD */}
      <div className="flex flex-col gap-3">
        {messages.map((m) => {
          const editable = canEditOrDelete(m.uid) && !disabled;
          const mEditing = editing?.type === "message" && editing.mid === m.id;
          const threadReplies = replies[m.id] || [];

          return (
            <div key={m.id} className="rounded-lg bg-gray-100">
              <div className="flex items-start gap-3 p-3">
                <Avatar nameOrEmail={m.author || m.uid} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{m.author || m.uid}</div>
                      <div className="text-xs text-gray-500">{fmt(m.createdAt)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.resolved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700">
                          <CheckCircle2 size={14} />
                          Resolved
                        </span>
                      )}
                      {!disabled && (
                        <div className="hidden sm:flex items-center gap-2">
                          {editable && !mEditing && (
                            <button
                              className="text-xs px-2 py-0.5 rounded hover:bg-gray-200/60"
                              onClick={() => beginEditMessage(m)}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {editable && (
                            <button
                              className="text-xs px-2 py-0.5 rounded text-red-600 hover:bg-red-100"
                              onClick={() => removeMessage(m)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            className="text-xs px-2 py-0.5 rounded hover:bg-gray-200/60"
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
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {renderWithMentions(m.text)}
                    </p>
                  )}
                </div>
              </div>

              {/* Replies */}
              <div className="pl-10 pr-3 pb-3 space-y-3">
                {threadReplies.map((r) => {
                  const rEditable = canEditOrDelete(r.uid) && !disabled;
                  const rEditing = editing?.type === "reply" && editing.mid === m.id && editing.rid === r.id;

                  return (
                    <div key={r.id} className="rounded-lg bg-white">
                      <div className="flex items-start gap-3 p-3">
                        <CornerDownRight size={16} className="mt-1 text-gray-400" />
                        <Avatar nameOrEmail={r.author || r.uid} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{r.author || r.uid}</div>
                              <div className="text-xs text-gray-500">{fmt(r.createdAt)}</div>
                            </div>
                            {!disabled && rEditable && !rEditing && (
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-xs px-2 py-0.5 rounded hover:bg-gray-200/60"
                                  onClick={() => beginEditReply(m.id, r)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="text-xs px-2 py-0.5 rounded text-red-600 hover:bg-red-100"
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
                            <p className="mt-2 text-sm whitespace-pre-wrap">
                              {renderWithMentions(r.text)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Reply composer */}
                {!disabled && (
                  <div className="relative">
                    <input
                      className="w-full border rounded-lg px-4 py-3 text-sm"
                      placeholder="Write a reply… (@email or @handle)"
                      value={draft[m.id] || ""}
                      onChange={(e) => handleDraftChange(m.id, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply(m.id)}
                    />

                    {mention.key === m.id && (mention.query || "").length > 0 && (
                      <div
                        ref={mentionBoxRef}
                        className="absolute left-0 top-full mt-1 w-56 rounded border bg-white shadow z-10"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {mentionCandidates.map((u) => (
                          <button
                            key={u.id}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(m.id, u.email);
                            }}
                          >
                            @{u.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW COMMENT */}
      <div>
        <div className="pt-4 relative flex items-center gap-2">
          <input
            disabled={disabled}
            className="flex-1 border rounded-lg px-4 py-3 text-sm"
            placeholder="Write a comment… (@email or @handle)"
            value={draft.new || ""}
            onChange={(e) => handleDraftChange("new", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !disabled && send()}
          />

          <button
            disabled={disabled || !(draft.new || "").trim()}
            className="px-4 py-3 rounded-lg bg-indigo-600 disabled:bg-gray-300 text-white text-sm font-medium hover:bg-indigo-700 active:scale-[.98]"
            onClick={send}
          >
            Send
          </button>

          {mention.key === "new" && mentionCandidates.length > 0 && (
            <div
              ref={mentionBoxRef}
              className="absolute left-0 top-full mt-1 w-56 rounded border bg-white shadow z-10"
              onMouseDown={(e) => e.preventDefault()}
            >
              {mentionCandidates.map((u) => (
                <button
                  key={u.id}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention("new", u.email);
                  }}
                >
                  @{u.email}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
