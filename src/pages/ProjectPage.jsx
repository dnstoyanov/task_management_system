import { useParams } from "react-router-dom";
import { useState } from "react";
import AppShell from "../app/layout/AppShell";
import Board from "../features/board/Board";
import ProjectMembersModal from "../features/projects/ProjectMembersModal";

export default function ProjectPage() {
  const { projectId } = useParams();
  const [membersOpen, setMembersOpen] = useState(false);
  return (
    <AppShell onManageMembers={() => setMembersOpen(true)}>
      <Board />
      {membersOpen && <ProjectMembersModal pid={projectId} onClose={()=>setMembersOpen(false)} />}
    </AppShell>
  );
}
