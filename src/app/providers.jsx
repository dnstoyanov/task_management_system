import { useEffect } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useProjectStore } from "../stores/project.store";

export function Providers({ children }) {
  const init = useAuthStore(s=>s.init);
  const user = useAuthStore(s=>s.user);
  const startPublic = useProjectStore(s=>s.startPublic);
  const stop = useProjectStore(s=>s.stop);

  useEffect(() => init(), [init]);
  useEffect(() => { if (user) startPublic(); else stop(); }, [user, startPublic, stop]);
  return children;
}
