import { useAuthStore } from "../../stores/useAuthStore";

export default function AppShell({ children, onNewProject }) {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold">Task Management</h1>
        <div className="flex items-center gap-3">
          <button onClick={onNewProject} className="px-3 py-1 rounded bg-blue-600 text-white">New Project</button>
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={logout} className="px-3 py-1 rounded border">Logout</button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
