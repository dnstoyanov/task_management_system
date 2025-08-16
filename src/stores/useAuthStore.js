import { create } from "zustand";
import { auth } from "../core/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  init: () => onAuthStateChanged(auth, (u) => set({ user: u, loading: false })),
  logout: async () => { await signOut(auth); },
}));
