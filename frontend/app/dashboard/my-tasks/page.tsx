"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { getTasks, updateTask } from "@/services/taskService";
import useDebounce from "@/hooks/useDebounce";
import usePagination, { emptyPaginationMeta } from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/PaginationControls";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  project?: { id: number; name: string } | null;
};

const statuses = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "completed", label: "Completed" },
];

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const { currentPage, recordsPerPage, meta, setMeta, resetPage, goToNextPage, goToPreviousPage, canGoNext, canGoPrevious } = usePagination(10);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await getTasks({ search: debouncedSearch.trim() || undefined, page: currentPage, per_page: recordsPerPage });
      setTasks(response.data?.data || []);
      setMeta(response.data?.meta || emptyPaginationMeta);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.message || "Could not load your tasks.") : "Could not load your tasks.");
    } finally { setLoading(false); }
  }, [debouncedSearch, currentPage, recordsPerPage, setMeta]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const changeStatus = async (task: Task, status: string) => {
    try {
      setUpdating(task.id); setError("");
      await updateTask(task.id, { status } as never);
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.message || "Could not update the task.") : "Could not update the task.");
    } finally { setUpdating(null); }
  };

  const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "No deadline";
  const isOverdue = (task: Task) => Boolean(task.due_date && !["completed", "cancelled"].includes(task.status || "") && new Date(task.due_date) < new Date());

  return <div className="space-y-6">
    <div className="dashboard-hero"><div><div className="dashboard-eyebrow">Assigned work</div><h1>My tasks</h1><p>Update progress here. Assignment, project and priority stay controlled by your manager.</p></div></div>
    {error && <div className="auth-message error">{error}</div>}
    <div className="dashboard-panel" style={{ padding: 14 }}>
      <input className="form-control" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Search by task title or description..." aria-label="Search tasks" />
    </div>

    {loading && tasks.length === 0 ? <div className="dashboard-panel">Loading your tasks...</div> : tasks.length === 0 ? <div className="dashboard-panel"><strong>No tasks found.</strong><div className="panel-caption" style={{ marginTop: 6 }}>Try another search or check back after work is assigned.</div></div> : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,330px),1fr))", gap: 14 }}>
        {tasks.map((task) => <article key={task.id} className="dashboard-panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div><div className="panel-caption">{task.project?.name || "No project"}</div><h2 style={{ fontSize: 16, margin: "4px 0 0" }}>{task.title}</h2></div>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", padding: "5px 8px", borderRadius: 999, background: task.priority === "urgent" ? "#ffedef" : "#f1f2ff", color: task.priority === "urgent" ? "#c83446" : "#5557c9" }}>{task.priority || "medium"}</span>
          </div>
          {task.description && <p style={{ color: "#667085", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{task.description}</p>}
          <div style={{ marginTop: "auto", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 650, color: isOverdue(task) ? "#c83446" : "#667085" }}>{isOverdue(task) ? "Overdue · " : "Due · "}{formatDate(task.due_date)}</span>
            <select className="form-control" style={{ width: "auto", minHeight: 38, padding: "6px 32px 6px 10px", fontSize: 11 }} value={task.status || "todo"} disabled={updating === task.id} onChange={(e) => changeStatus(task, e.target.value)}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
        </article>)}
      </div>
    )}

    <PaginationControls currentPage={currentPage} lastPage={meta.last_page} canGoPrevious={canGoPrevious} canGoNext={canGoNext} onPrevious={goToPreviousPage} onNext={goToNextPage} />
  </div>;
}
