"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import useAuthUser from "@/hooks/useAuthUser";
import useDebounce from "@/hooks/useDebounce";
import { getProjects } from "@/services/projectService";

export default function ProjectsPage() {
  const { canManageWork } = useAuthUser();
  const [projects, setProjects] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 260);
  const [status, setStatus] = useState("");
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const loadProjects = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (hasLoaded.current) setRefreshing(true);

    try {
      const response = await getProjects({
        search: debouncedSearch.trim() || undefined,
        status: status || undefined,
        per_page: 100,
      });
      if (currentRequest === requestId.current) setProjects(response.data.data || []);
    } finally {
      if (currentRequest === requestId.current) {
        hasLoaded.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, status]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="work-page">
      <div className="work-page-head">
        <div>
          <span className="eyebrow">Portfolio</span>
          <h1>Projects</h1>
          <p>See progress, ownership, deadlines and delivery risk across active initiatives.</p>
        </div>
        {canManageWork && <Link className="primary-action" href="/dashboard/projects/create"><AppIcon name="plus" />New project</Link>}
      </div>

      <div className="work-toolbar">
        <div className="search-control"><AppIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects…" /></div>
        <select className="toolbar-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option>
        </select>
      </div>

      <div className="results-status" aria-live="polite">
        <span>{projects.length} project{projects.length === 1 ? "" : "s"}</span>
        {refreshing && <span className="results-refreshing"><span className="loader-dot" />Updating results…</span>}
      </div>

      {initialLoading ? (
        <div className="work-loading">Loading projects…</div>
      ) : (
        <div className={`project-grid ${refreshing ? "results-updating" : ""}`}>
          {projects.map((project) => {
            const percent = project.tasks_count ? Math.round((project.completed_tasks_count || 0) / project.tasks_count * 100) : 0;
            const overdue = project.overdue_tasks_count || 0;
            return (
              <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="project-card">
                <div className="project-card-top"><span className="project-icon" style={{ background: project.color || undefined }}>{project.key?.slice(0, 2) || "P"}</span><span className={`health-badge ${project.health || "on_track"}`}><i />{(project.health || "on_track").replace("_", " ")}</span></div>
                <div className="project-key">{project.key}</div><h3>{project.name}</h3><p>{project.description || "No project description yet."}</p>
                <div className="project-progress-head"><span>Progress</span><b>{percent}%</b></div><div className="project-progress"><i style={{ width: `${percent}%` }} /></div>
                <div className="project-stats"><span><strong>{project.tasks_count || 0}</strong> tasks</span><span className={overdue ? "text-danger" : ""}><strong>{overdue}</strong> overdue</span><span><strong>{project.members?.length || 0}</strong> members</span></div>
                <footer><div className="avatar-stack">{project.members?.slice(0, 4).map((member: any) => <span className="mini-avatar" key={member.id}>{member.name.charAt(0)}</span>)}</div><span>{project.due_date ? `Due ${new Date(project.due_date).toLocaleDateString()}` : "No deadline"}</span></footer>
              </Link>
            );
          })}
          {!projects.length && <div className="empty-state"><AppIcon name="projects" /><h3>No projects found</h3><p>Create a project to group outcomes, people and tasks.</p></div>}
        </div>
      )}
    </div>
  );
}
