import { useEffect, useState } from "react";
import { ProjectService } from "../../core/services/project.service";
import { UserService } from "../../core/services/user.service";
import { useAuthStore } from "../../stores/useAuthStore";

export default function ProjectMembersModal({ pid, onClose }) {
  const me = useAuthStore(s=>s.user);
  const [project, setProject] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [email, setEmail] = useState("");
  const isOwner = project && me?.uid === project.owner;

  useEffect(() => {
    const unsub = ProjectService.watchOne(pid, async (p) => {
      setProject(p);
      if (p) setProfiles(await UserService.profiles(p.members || []));
    });
    return () => unsub && unsub();
  }, [pid]);

  const add = async () => {
    const found = await UserService.byEmail(email.trim());
    if (!found) return alert("No user with that email.");
    await ProjectService.addMemberByUid(pid, found.id);
    setEmail("");
  };
  const remove = async (uid) => { if (!isOwner || uid === project.owner) return; await ProjectService.removeMemberByUid(pid, uid); };
  const makeOwner = async (uid) => { if (!isOwner) return; await ProjectService.transferOwner(pid, uid); };

  if (!project) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Project Members</h2>

        <ul className="divide-y border rounded mb-4">
          {profiles.map((u) => (
            <li key={u.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{u.displayName || u.email}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
              <div className="flex gap-2">
                {project.owner === u.id && <span className="text-xs px-2 py-1 rounded bg-yellow-100">Owner</span>}
                {isOwner && project.owner !== u.id && (
                  <>
                    <button onClick={() => makeOwner(u.id)} className="text-xs border rounded px-2 py-1">Make owner</button>
                    <button onClick={() => remove(u.id)} className="text-xs border rounded px-2 py-1 text-red-600">Remove</button>
                  </>
                )}
              </div>
            </li>
          ))}
          {!profiles.length && <li className="p-3 text-sm text-gray-500">No members yet.</li>}
        </ul>

        {isOwner && (
          <div className="flex gap-2">
            <input className="flex-1 border rounded px-3 py-2" placeholder="Add by email"
                   value={email} onChange={(e)=>setEmail(e.target.value)} />
            <button onClick={add} className="px-3 py-2 rounded bg-blue-600 text-white">Add</button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
