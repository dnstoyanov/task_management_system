import { create } from "zustand";
import {
  watchMine,
  markRead,
  markAllMineRead,
  deleteAllMine,
} from "../services/notification.service";

export const useNotificationStore = create((set, get) => {
  let unsub = null;
  return {
    items: [],
    unread: 0,

    start(uid) {
      if (!uid) return;
      get().stop();
      unsub = watchMine(uid, (items) =>
        set({
          items,
          unread: items.filter((n) => !n.read).length,
        })
      );
    },

    stop() {
      if (unsub) {
        try {
          unsub();
        } catch {}
        unsub = null;
      }
      set({ items: [], unread: 0 });
    },

    async markOne(n) {
      await markRead({ pid: n.pid, id: n.id, read: true });
    },

    async markAll(uid) {
      await markAllMineRead(uid);
    },

    async clearAll(uid) {
      await deleteAllMine(uid);
      // optimistic local clear
      set({ items: [], unread: 0 });
    },
  };
});
