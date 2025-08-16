import { useEffect } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useProjectStore } from "../stores/project.store";

export function Providers({ children }) {
  const init = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const start = useProjectStore(s => s.start);
  const stop = useProjectStore(s => s.stop);

  useEffect(() => init(), [init]);
  useEffect(() => { if (user) start(user.uid); else stop(); }, [user, start, stop]);

  return children;
}
