// src/app/layout/AppShell.jsx
import { useAuthStore } from "../../stores/useAuthStore";

function Avatar({ user }) {
  const letter =
    (user?.displayName || user?.email || "?").trim().charAt(0).toUpperCase() || "?";

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt="User avatar"
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
      {letter}
    </div>
  );
}

export default function AppShell({ children, onNewProject, onManageMembers }) {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold">Task Management</h1>

        <div className="flex items-center gap-3">
          {onManageMembers && (
            <button
              onClick={onManageMembers}
              className="px-3 py-1 bg-blue-600 text-white font-semibold rounded border"
            >
              + Members
            </button>
          )}

          {onNewProject && (
            <button
              onClick={onNewProject}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              New Project
            </button>
          )}

          {/* Avatar + email (separated from the left group) */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <Avatar user={user} />
            <span className="text-sm text-gray-700">
              {user?.email || user?.displayName}
            </span>

            {/* Divider matching the left one */}
            <div className="pl-2 ml-2 border-l">
              <button
                onClick={logout}
                title="Logout"
                aria-label="Logout"
                className="px-3 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
