import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { MessageService } from "../../core/services/message.service";
import { UserService } from "../../core/services/user.service";

/** Embedded task chat (no modal). */
export default function TaskChat({ pid, task, disabled = false }) {
  const me = useAuthStore((s) => s.user);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState({});
  const endRef = useRef(null);

  useEffect(() => {
    const unsub = MessageService.watch(pid, task.id, async (items) => {
      setMsgs(items);
      const uids = [...new Set(items.map((m) => m.uid))];
      const profiles = await Promise.all(uids.map((u) => UserService.profile(u)));
      const map = {}; profiles.filter(Boolean).forEach((p) => (map[p.id] = p));
      setUsers(map);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    });
    return () => unsub && unsub();
  }, [pid, task.id]);

  const send = async () => {
    const t = text.trim(); if (!t || disabled) return;
    await MessageService.send(pid, task.id, { uid: me.uid, text: t });
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-3 space-y-3 overflow-y-auto max-h-64">
        {msgs.map((m) => {
          const u = users[m.uid];
          const name = u?.displayName || u?.email || m.uid;
          return (
            <div key={m.id} className="text-sm">
              <div className="font-medium">{name}</div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t p-2 flex gap-2">
        <textarea
          className="flex-1 border rounded px-3 py-2 resize-none h-10 disabled:bg-gray-100"
          placeholder={disabled ? "Comments are disabled (task is locked)" : "Add a comment..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        <button
          onClick={send}
          disabled={disabled || !text.trim()}
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
