// src/features/projects/ProjectCard.jsx
import { Users, Trash2, Crown } from "lucide-react";

/** tiny colored dot */
const Dot = ({ className }) => (
  <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />
);

/** status -> color */
const STATUS_COLORS = {
  backlog: "bg-gray-400",
  analyze: "bg-sky-500",
  develop: "bg-violet-500",
  testing: "bg-amber-500",
  done: "bg-green-500",
};

export default function ProjectCard({
  project,
  taskStats,              // { total, byStatus: {backlog, analyze, develop, testing, done} }
  onOpen,                 // clicking the whole card opens
  onDelete,               // delete handler (icon only)
  showDelete = false,     // owner only
}) {
  const members = project?.members || [];
  const total = taskStats?.total ?? 0;
  const by = taskStats?.byStatus || {
    backlog: 0, analyze: 0, develop: 0, testing: 0, done: 0,
  };

  const title = project.title || project.name || "Untitled project";

  const handleCardClick = () => onOpen && onOpen();
  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && onOpen) {
      e.preventDefault();
      onOpen();
    }
  };
  const stop = (e) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group relative rounded-2xl border bg-white hover:shadow-md transition p-4 flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="text-lg sm:text-[17px] font-semibold text-gray-900 leading-6 line-clamp-2 break-words"
              title={title}
            >
              {title}
            </h3>
            {showDelete && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-yellow-50 text-yellow-700">
                <Crown size={12} /> Owner
              </span>
            )}
          </div>

          {project.description ? (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 break-words">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">No description</p>
          )}
        </div>

        {/* delete icon (no edit, no open button) */}
        {showDelete && (
          <button
            className="p-2 rounded border hover:bg-red-50 text-red-600 shrink-0"
            title="Delete project"
            aria-label="Delete project"
            onClick={(e) => { stop(e); onDelete?.(); }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* quick stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-500" />
          <span className="font-medium">{members.length}</span>
          <span className="text-gray-500">members</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{total}</span>
          <span className="text-gray-500">tasks</span>
        </div>
      </div>

      {/* per-status breakdown */}
      <div className="mt-3">
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          <div className="flex items-center gap-1">
            <Dot className={STATUS_COLORS.backlog} />
            <span>Backlog</span>
            <span className="font-medium">{by.backlog}</span>
          </div>
          <div className="flex items-center gap-1">
            <Dot className={STATUS_COLORS.analyze} />
            <span>Analyze</span>
            <span className="font-medium">{by.analyze}</span>
          </div>
          <div className="flex items-center gap-1">
            <Dot className={STATUS_COLORS.develop} />
            <span>Develop</span>
            <span className="font-medium">{by.develop}</span>
          </div>
          <div className="flex items-center gap-1">
            <Dot className={STATUS_COLORS.testing} />
            <span>Testing</span>
            <span className="font-medium">{by.testing}</span>
          </div>
          <div className="flex items-center gap-1">
            <Dot className={STATUS_COLORS.done} />
            <span>Done</span>
            <span className="font-medium">{by.done}</span>
          </div>
        </div>

        {/* mini progress bar */}
        <div className="mt-2 h-2 w-full bg-gray-100 rounded overflow-hidden flex">
          {["backlog", "analyze", "develop", "testing", "done"].map((k) => {
            const v = by[k];
            const pct = total > 0 ? (v / total) * 100 : 0;
            return (
              <div
                key={k}
                className={STATUS_COLORS[k]}
                style={{ width: `${pct}%` }}
                title={`${k}: ${v}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
