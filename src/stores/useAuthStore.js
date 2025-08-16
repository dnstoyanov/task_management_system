import { create } from "zustand";
import { auth } from "../core/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  init: () => {
  const unsub = onAuthStateChanged(auth, (u) => {
    console.log("[auth] user:", u ? { uid: u.uid, email: u.email, name: u.displayName } : null);
    set({ user: u, loading: false });
  });
  return unsub;
},
  logout: async () => { await signOut(auth); },
}));
