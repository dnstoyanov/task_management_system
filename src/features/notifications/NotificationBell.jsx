import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "./useNotifications";

export default function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100"
        title="Notifications"
      >
        <Bell size={18}/>
        {!!unreadCount && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            <button className="text-xs underline" onClick={markAllRead}>Mark all read</button>
          </div>
          {items.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Nothing new.</div>
          ) : items.map(n => (
            <div
              key={n.id}
              className={`px-3 py-2 text-sm ${n.read ? "text-gray-500" : "text-gray-900 bg-blue-50/40"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="line-clamp-2">{n.text}</div>
              <div className="text-xs text-gray-400">{n.createdAt?.toDate?.().toLocaleString?.() ?? ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
