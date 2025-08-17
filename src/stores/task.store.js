// src/stores/task.store.js
import { create } from "zustand";
import {
  watchTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../core/services/task.service";
import { useAuthStore } from "./useAuthStore";

export const useTaskStore = create((set, get) => {
  let unsub = null;

  return {
    tasks: [],

    // Live updates
    start: (projectId) => {
      if (!projectId) return;
      get().stop();
      unsub = watchTasks(
        projectId,
        (list) => set({ tasks: list }),
        (err) => console.warn("[task.store watch error]", err?.code || err)
      );
    },

    stop: () => {
      if (unsub) {
        try { unsub(); } catch {}
        unsub = null;
      }
      set({ tasks: [] });
    },

    // CRUD – these sanitize inside the service so they only write allowed keys
    create: async (projectId, data) => {
      const byUid = useAuthStore.getState().user?.uid || null;
      await createTask(projectId, data, byUid);
    },

    update: async (projectId, taskId, patch) => {
      const byUid = useAuthStore.getState().user?.uid || null;
      await updateTask(projectId, taskId, patch, byUid);
    },

    remove: async (projectId, taskId) => {
      await deleteTask(projectId, taskId);
    },
  };
});
