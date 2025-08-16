import { create } from "zustand";
import { ProjectService } from "../core/services/project.service";

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentId: null,
  unsub: null,

  startPublic() {                      // 👈 new starter
    get().stop();
    const unsub = ProjectService.watchAll((items)=> set({ projects: items }));
    set({ unsub });
  },
  stop(){ const u=get().unsub; if(u){u(); set({unsub:null});} },

  setCurrent(id){ set({ currentId:id }); },
  async create(name, uid){ await ProjectService.create({ name, uid }); },
  async rename(id, name){ await ProjectService.rename(id, name); },
  async remove(id){ if(get().currentId===id) set({ currentId:null }); await ProjectService.remove(id); },
}));
