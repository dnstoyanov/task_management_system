import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNotificationStore } from "../../stores/notification.store";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

function Avatar({ user }) {
  const letter = (user?.displayName || user?.email || "?").trim().charAt(0).toUpperCase() || "?";
  return user?.photoURL
    ? <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">{letter}</div>;
}

export default function AppShell({ children, onNewProject, onManageMembers }) {
  const { user, logout } = useAuthStore();
  const { items, unread, start, stop, markOne, markAll } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => { if (user?.uid) { start(user.uid); return () => stop(); } }, [user?.uid, start, stop]);
  useEffect(() => {
    const f = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f);
  }, [open]);

  if (!user) return null;

  const openNotif = async (n) => {
    await markOne(n);
    setOpen(false);
    if (n.taskId && n.pid) nav(`/p/${n.pid}?t=${n.taskId}`);
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white relative">
        <h1 className="text-xl font-bold">Task Management</h1>
        <div className="flex items-center gap-3">
          {onManageMembers && <button onClick={onManageMembers} className="px-3 py-1 bg-blue-600 text-white font-semibold rounded border">+ Members</button>}
          {onNewProject && <button onClick={onNewProject} className="px-3 py-1 rounded bg-blue-600 text-white">New Project</button>}
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <div className="relative" ref={ref}>
            <button className="relative p-2 rounded border hover:bg-gray-50" onClick={() => setOpen(v => !v)}>
              <Bell size={16} />
              {unread > 0 && <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">{unread}</span>}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white border rounded-xl shadow-lg z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="font-semibold text-sm">Notifications</div>
                  <button disabled={unread === 0} onClick={() => markAll(user.uid)}
                          className="text-xs px-2 py-1 rounded border disabled:opacity-50">Mark all read</button>
                </div>
                <ul className="max-h-96 overflow-auto">
                  {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-500">No notifications</li>}
                  {items.map((n) => (
                    <li key={n.id} className={`px-3 py-2 border-b last:border-b-0 ${!n.read ? "bg-gray-50" : ""}`}>
                      <button className="text-left w-full" onClick={() => openNotif(n)}>
                        <div className="text-sm">
                          {n.type === "assignment" ? "You were assigned to a task" : "You were mentioned in a comment"}
                        </div>
                        {n.taskId && <div className="text-xs text-gray-500">Open task</div>}
                        <div className="text-[11px] text-gray-400">{n.createdAt?.toDate?.() ? n.createdAt.toDate().toLocaleString() : ""}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <div className="flex items-center gap-2">
            <Avatar user={user} />
            <span className="text-sm text-gray-700">{user.email || user.displayName}</span>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button onClick={logout} className="px-3 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200">Logout</button>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
