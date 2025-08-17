import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNotificationStore } from "../../stores/notification.store";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  UserPlus,
  AtSign,
  ArrowRight,
  Flag,
} from "lucide-react";

function Avatar({ user }) {
  const letter =
    (user?.displayName || user?.email || "?").trim().charAt(0).toUpperCase() ||
    "?";
  return user?.photoURL ? (
    <img
      src={user.photoURL}
      alt="User avatar"
      className="w-8 h-8 rounded-full object-cover"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
      {letter}
    </div>
  );
}

function cap(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function rightArrow() {
  return <ArrowRight size={14} className="inline mx-1 align-middle" />;
}

export default function AppShell({ children, onNewProject, onManageMembers }) {
  const { user, logout } = useAuthStore();
  const { items, unread, start, stop, markOne, markAll, clearAll } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      start(user.uid);
      return () => stop();
    }
  }, [user?.uid, start, stop]);

  useEffect(() => {
    const f = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [open]);

  if (!user) return null;

  const openNotif = async (n) => {
    await markOne(n);
    setOpen(false);
    if (n.taskId && n.pid) nav(`/p/${n.pid}?t=${n.taskId}`);
  };

  const typeMeta = (n) => {
    switch (n.type) {
      case "assignment":
        return {
          icon: <UserPlus size={16} />,
          accent: "bg-blue-100 text-blue-700 border-blue-200",
          title: "Assigned to you",
          detail: "Open task",
        };
      case "mention":
        return {
          icon: <AtSign size={16} />,
          accent: "bg-purple-100 text-purple-700 border-purple-200",
          title: "Mentioned in a comment",
          detail: "Open task",
        };
      case "status": {
        const oldS = cap(n.oldStatus || "");
        const newS = cap(n.newStatus || "");
        return {
          icon: <ArrowRight size={16} />,
          accent: "bg-amber-100 text-amber-700 border-amber-200",
          title: "Status changed",
          detail: `${oldS} ${" "}${"→"} ${" "}${newS}`,
        };
      }
      case "priority": {
        const oldP = cap(n.oldPriority || "");
        const newP = cap(n.newPriority || "");
        return {
          icon: <Flag size={16} />,
          accent: "bg-rose-100 text-rose-700 border-rose-200",
          title: "Priority changed",
          detail: `${oldP} ${" "}${"→"} ${" "}${newP}`,
        };
      }
      default:
        return {
          icon: <Bell size={16} />,
          accent: "bg-gray-100 text-gray-700 border-gray-200",
          title: "Notification",
          detail: "",
        };
    }
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white relative">
        <h1 className="text-xl font-bold">Task Management</h1>

        <div className="flex items-center gap-3">
          {onManageMembers && (
            <button
              onClick={onManageMembers}
              className="px-3 py-1 bg-blue-600 text-white font-semibold rounded border"
            >
              + Members
            </button>
          )}
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              New Project
            </button>
          )}

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Bell + tray */}
          <div className="relative" ref={ref}>
            <button
              className="relative p-2 rounded border hover:bg-gray-50"
              onClick={() => setOpen((v) => !v)}
              title="Notifications"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                  {unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white border rounded-xl shadow-lg z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="font-semibold text-sm">Notifications</div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={unread === 0}
                      onClick={() => markAll(user.uid)}
                      className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                      title="Mark all as read"
                    >
                      Mark all read
                    </button>
                    <button
                      disabled={items.length === 0}
                      onClick={() => clearAll(user.uid)}
                      className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                      title="Clear all notifications"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <ul className="max-h-96 overflow-auto">
                  {items.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-gray-500">
                      No notifications
                    </li>
                  )}

                  {items.map((n) => {
                    const meta = typeMeta(n);
                    return (
                      <li
                        key={n.id}
                        className={`px-3 py-2 border-b last:border-b-0 ${
                          !n.read ? "bg-gray-50" : ""
                        }`}
                      >
                        <button
                          className="text-left w-full flex items-start gap-3"
                          onClick={() => openNotif(n)}
                        >
                          <span
                            className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded border ${meta.accent}`}
                            aria-hidden
                          >
                            {meta.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {meta.title}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {meta.detail || (n.taskId ? "Open task" : "")}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {n.createdAt?.toDate?.()
                                ? n.createdAt.toDate().toLocaleString()
                                : ""}
                            </div>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <div className="flex items-center gap-2">
            <Avatar user={user} />
            <span className="text-sm text-gray-700">
              {user.email || user.displayName}
            </span>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button
              onClick={logout}
              className="px-3 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
