"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import TaskCard, { Avatar } from "@/components/work/TaskCard";
import TaskComposer from "@/components/work/TaskComposer";
import useAuthUser from "@/hooks/useAuthUser";
import useDebounce from "@/hooks/useDebounce";
import {
  createSavedView,
  deleteSavedView,
  getSavedViews,
  getWorkTasks,
  getWorkspace,
  reorderTasks,
} from "@/services/workService";
import type { Task, Workspace } from "@/lib/workTypes";

const columns = [
  { key: "todo", label: "To do", hint: "Ready to start" },
  { key: "in_progress", label: "In progress", hint: "Actively being worked" },
  { key: "review", label: "Review", hint: "Waiting for review" },
  { key: "completed", label: "Done", hint: "Completed work" },
] as const;

export default function TasksPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 260);
  const [priority, setPriority] = useState("");
  const [project, setProject] = useState(searchParams.get("project") || "");
  const [due, setDue] = useState("");
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [composer, setComposer] = useState(false);
  const [composerStatus, setComposerStatus] = useState("todo");
  const [dragId, setDragId] = useState<number | null>(null);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);
  const openedFromQuery = useRef(false);
  const mine = searchParams.get("mine") === "1";

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const response = await getWorkspace();
        if (!cancelled) setWs(response.data);
      } catch {
        // Task data can still load even if workspace options fail.
      }
    }
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTasks = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (hasLoaded.current) setRefreshing(true);

    try {
      const params: Record<string, unknown> = { per_page: 200, sort: "smart" };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (priority) params.priority = priority;
      if (project) params.project_id = project;
      if (due) params.due = due;
      if (mine && user) params.assignee_id = user.id;

      const response = await getWorkTasks(params);
      if (currentRequest === requestId.current) setTasks(response.data.data || []);
    } finally {
      if (currentRequest === requestId.current) {
        hasLoaded.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, priority, project, due, mine, user?.id]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;
    async function loadSavedViews() {
      try {
        const response = await getSavedViews();
        if (!cancelled) setSavedViews((response.data || []).filter((item: any) => item.scope === "tasks"));
      } catch {
        // Saved views are optional and should not block the page.
      }
    }
    void loadSavedViews();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, tasks.filter((task) => task.status === column.key)])) as Record<string, Task[]>,
    [tasks]
  );

  const canCreateTasks = ws?.permissions.can_create_tasks ?? false;

  useEffect(() => {
    if (openedFromQuery.current || searchParams.get("create") !== "1" || !canCreateTasks) return;
    openedFromQuery.current = true;
    setComposer(true);
  }, [searchParams, canCreateTasks]);

  const move = async (status: string) => {
    if (!dragId) return;
    const task = tasks.find((item) => item.id === dragId);
    if (!task || task.status === status) {
      setDragId(null);
      return;
    }

    const previous = tasks;
    setTasks((current) => current.map((item) => (item.id === dragId ? { ...item, status: status as Task["status"] } : item)));
    setDragId(null);

    try {
      await reorderTasks([{ id: task.id, status, position: grouped[status]?.length || 0 }]);
    } catch {
      setTasks(previous);
    }
  };

  const openComposer = (status = "todo") => {
    setComposerStatus(status);
    setComposer(true);
  };

  const applyView = (id: string) => {
    const item = savedViews.find((saved) => String(saved.id) === id);
    if (!item) return;
    const filters = item.filters || {};
    setSearch(String(filters.search || ""));
    setPriority(String(filters.priority || ""));
    setProject(String(filters.project || ""));
    setDue(String(filters.due || ""));
    setView(filters.view === "list" ? "list" : "board");
  };

  const saveView = async () => {
    if (!viewName.trim()) return;
    const response = await createSavedView({
      name: viewName.trim(),
      scope: "tasks",
      filters: { search, priority, project, due, view, mine },
    });
    setSavedViews((current) => [...current, response.data]);
    setViewName("");
    setSaveOpen(false);
  };

  const removeView = async (id: number) => {
    await deleteSavedView(id);
    setSavedViews((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="work-page">
      <div className="work-page-head">
        <div>
          <span className="eyebrow">Execution</span>
          <h1>{mine ? "My work" : "Tasks"}</h1>
          <p>{mine ? "Everything assigned to you, organized by where it stands." : "Plan, prioritize and move work through your team workflow."}</p>
        </div>
        {canCreateTasks && (
          <button className="primary-action" onClick={() => openComposer()}>
            <AppIcon name="plus" />New task
          </button>
        )}
      </div>

      <div className="work-toolbar">
        <div className="search-control">
          <AppIcon name="search" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, projects…" />
        </div>
        <select className="toolbar-select" value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">All projects</option>
          {ws?.projects.map((item) => <option key={item.id} value={item.id}>{item.key} · {item.name}</option>)}
        </select>
        <select className="toolbar-select" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="toolbar-select" value={due} onChange={(event) => setDue(event.target.value)}>
          <option value="">Any due date</option><option value="today">Due today</option><option value="week">Due this week</option><option value="overdue">Overdue</option><option value="none">No due date</option>
        </select>
        <div className="saved-view-control">
          <select className="toolbar-select" defaultValue="" onChange={(event) => { applyView(event.target.value); event.currentTarget.value = ""; }}>
            <option value="">Saved views</option>{savedViews.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="icon-action" title="Save current view" onClick={() => setSaveOpen((value) => !value)}><AppIcon name="sparkles" /></button>
        </div>
        <div className="view-switch">
          <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}><AppIcon name="board" />Board</button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><AppIcon name="list" />List</button>
        </div>
      </div>

      <div className="results-status" aria-live="polite">
        <span>{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
        {refreshing && <span className="results-refreshing"><span className="loader-dot" />Updating results…</span>}
      </div>

      {saveOpen && (
        <div className="saved-view-panel">
          <div><strong>Save this view</strong><span>Keep the current filters and layout for one-click access.</span></div>
          <input autoFocus value={viewName} onChange={(event) => setViewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveView()} placeholder="e.g. Urgent this week" />
          <button className="primary-action compact" onClick={saveView}>Save</button>
          {savedViews.length > 0 && <div className="saved-view-chips">{savedViews.map((item) => <span key={item.id}>{item.name}<button aria-label={`Delete ${item.name}`} onClick={() => removeView(item.id)}>×</button></span>)}</div>}
        </div>
      )}

      {initialLoading ? (
        <div className="work-loading"><span className="loader-dot" />Loading workspace…</div>
      ) : view === "board" ? (
        <div className={`kanban-board ${refreshing ? "results-updating" : ""}`}>
          {columns.map((column) => (
            <section key={column.key} className="kanban-column" onDragOver={(event) => event.preventDefault()} onDrop={() => move(column.key)}>
              <div className="kanban-head">
                <div><div className="kanban-title"><span className={`status-dot ${column.key}`} />{column.label}<b>{grouped[column.key]?.length || 0}</b></div><div className="kanban-hint">{column.hint}</div></div>
                {canCreateTasks && <button className="column-add" onClick={() => openComposer(column.key)}><AppIcon name="plus" /></button>}
              </div>
              <div className="kanban-stack">
                {grouped[column.key]?.map((task) => (
                  <div key={task.id} draggable onDragStart={() => setDragId(task.id)} onDragEnd={() => setDragId(null)} className={dragId === task.id ? "dragging" : ""}><TaskCard task={task} /></div>
                ))}
                {!grouped[column.key]?.length && <div className="empty-column">No tasks here</div>}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={`task-list-shell ${refreshing ? "results-updating" : ""}`}>
          <div className="task-list-head"><span>Task</span><span>Project</span><span>Assignees</span><span>Priority</span><span>Due</span><span>Status</span></div>
          {tasks.map((task) => {
            const overdue = task.due_date && !["completed", "cancelled"].includes(task.status) && new Date(task.due_date) < new Date();
            return (
              <Link href={`/dashboard/tasks/${task.id}`} className="task-list-row" key={task.id}>
                <div><span className="task-key">{task.project?.key}-{task.task_number || task.id}</span><strong>{task.title}</strong></div>
                <span>{task.project?.name || "—"}</span>
                <div className="avatar-stack">{task.assignees?.slice(0, 3).map((assignee) => <Avatar key={assignee.id} name={assignee.name} />)}</div>
                <span className={`priority-pill ${task.priority}`}>{task.priority}</span>
                <span className={overdue ? "text-danger" : ""}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No date"}</span>
                <span className={`status-pill ${task.status}`}>{task.status.replace("_", " ")}</span>
              </Link>
            );
          })}
          {!tasks.length && <div className="empty-state"><AppIcon name="tasks" /><h3>No tasks match</h3><p>Try clearing filters or create a new task.</p></div>}
        </div>
      )}

      <TaskComposer open={composer} initialStatus={composerStatus} onClose={() => setComposer(false)} onCreated={() => void loadTasks()} />
    </div>
  );
}
