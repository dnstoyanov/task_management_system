import { useProjectStore } from "../../stores/project.store";
import { Link } from "react-router-dom";

export default function ProjectList() {
  const { projects } = useProjectStore();
  if (!projects.length) return <p className="text-gray-500">No projects yet.</p>;
  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(p => (
        <li key={p.id} className="border rounded-lg p-4 hover:shadow">
          <h3 className="font-semibold">{p.name}</h3>
          <Link to={`/p/${p.id}`} className="text-blue-600 text-sm">Open</Link>
        </li>
      ))}
    </ul>
  );
}
