import { create } from "zustand";
import { watchTasks, createTask, updateTask, removeTask } from "../core/services/task.service";

export const useTaskStore = create((set, get) => {
  let unsub = null;

  return {
    tasks: [],

    start: (pid) => {
      if (!pid) { console.warn("[task.store] no pid"); return; }
      get().stop();
      unsub = watchTasks(pid, (list) => set({ tasks: list }));
    },

    stop: () => {
      if (unsub) { try { unsub(); } catch {} finally { unsub = null; } }
      set({ tasks: [] });
    },

    // expose CRUD for Board.jsx
    create: (pid, data) => createTask(pid, data),
    update: (pid, id, patch) => updateTask(pid, id, patch),
    remove: (pid, id) => removeTask(pid, id),
  };
});
