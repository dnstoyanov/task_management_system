import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { MessageService } from "../../core/services/message.service";
import { UserService } from "../../core/services/user.service";

export default function TaskChat({ pid, task, onClose }) {
  const me = useAuthStore(s=>s.user);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState({});
  const endRef = useRef(null);

  useEffect(() => {
    const unsub = MessageService.watch(pid, task.id, async (items) => {
      setMsgs(items);
      // fetch user profiles (simple cache by uid)
      const uids = [...new Set(items.map(m=>m.uid))];
      const profiles = await Promise.all(uids.map((u)=>UserService.profile(u)));
      const map = {}; profiles.filter(Boolean).forEach(p => map[p.id] = p);
      setUsers(map);
      setTimeout(()=> endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    });
    return () => unsub && unsub();
  }, [pid, task.id]);

  const send = async () => {
    const t = text.trim(); if (!t) return;
    await MessageService.send(pid, task.id, { uid: me.uid, text: t });
    setText("");
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <div className="font-semibold">Chat: {task.title}</div>
            <div className="text-xs text-gray-500">Project {pid} • Task {task.id}</div>
          </div>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {msgs.map(m => {
            const u = users[m.uid];
            return (
              <div key={m.id} className="text-sm">
                <div className="font-medium">{u?.displayName || u?.email || m.uid}</div>
                <div className="">{m.text}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t flex gap-2">
          <input className="flex-1 border rounded px-3 py-2"
                 placeholder="Write a comment..."
                 value={text} onChange={(e)=>setText(e.target.value)} />
          <button onClick={send} className="px-3 py-2 rounded bg-blue-600 text-white">Send</button>
        </div>
      </div>
    </div>
  );
}
