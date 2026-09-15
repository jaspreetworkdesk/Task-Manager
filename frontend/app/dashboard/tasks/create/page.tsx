"use client";

import { useRouter, useSearchParams } from "next/navigation";
import TaskComposer from "@/components/work/TaskComposer";

export default function CreateTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const project = searchParams.get("project") || undefined;

  const finish = () => router.replace(project ? `/dashboard/tasks?project=${project}` : "/dashboard/tasks");

  return (
    <div className="work-page">
      <div className="work-page-head">
        <div><span className="eyebrow">Create</span><h1>New task</h1><p>Create work, assign project teammates, and keep ownership clear.</p></div>
      </div>
      <TaskComposer open initialProjectId={project} onClose={finish} onCreated={finish} />
    </div>
  );
}
