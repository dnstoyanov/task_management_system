import { create } from "zustand";
import { TaskService } from "../core/services/task.service";

export const useTaskStore = create((set, get) => ({
  tasks: [],
  unsub: null,

  start(pid) {
    get().stop();
    const unsub = TaskService.watch(pid, (items) => set({ tasks: items }));
    set({ unsub });
  },
  stop() { const u = get().unsub; if (u) { u(); set({ unsub: null }); } },

  create: (pid, task) => TaskService.create(pid, task),
  update: (pid, tid, patch) => TaskService.update(pid, tid, patch),
  remove: (pid, tid) => TaskService.remove(pid, tid),
}));
