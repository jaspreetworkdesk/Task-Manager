"use client";

import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import useAuthUser from "@/hooks/useAuthUser";
import { createTask, getWorkspace } from "@/services/workService";
import type { Workspace } from "@/lib/workTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialStatus?: string;
  initialProjectId?: number | string;
  parentId?: number;
};

const blank = (status: string, project?: number | string, parentId?: number) => ({
  title: "",
  description: "",
  project_id: project ? String(project) : "",
  parent_id: parentId || null,
  status,
  priority: "medium",
  due_date: "",
  estimate_minutes: "",
  assignee_ids: [] as number[],
  label_ids: [] as number[],
  recurrence_pattern: "",
  recurrence_interval: "1",
});

export default function TaskComposer({
  open,
  onClose,
  onCreated,
  initialStatus = "todo",
  initialProjectId,
  parentId,
}: Props) {
  const { user, canManageWork } = useAuthUser();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => blank(initialStatus, initialProjectId, parentId));

  useEffect(() => {
    if (!open || ws) return;

    let cancelled = false;
    async function loadWorkspace() {
      setLoadingWorkspace(true);
      try {
        const response = await getWorkspace();
        if (!cancelled) setWs(response.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Could not load workspace options.");
      } finally {
        if (!cancelled) setLoadingWorkspace(false);
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [open, ws]);

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      status: initialStatus,
      project_id: initialProjectId ? String(initialProjectId) : current.project_id,
      parent_id: parentId || null,
    }));
  }, [open, initialStatus, initialProjectId, parentId]);

  const eligibleProjects = useMemo(
    () => ws?.projects.filter((project) => canManageWork || project.can_create_task) || [],
    [ws, canManageWork]
  );

  const selectedProject = useMemo(
    () => ws?.projects.find((project) => String(project.id) === String(form.project_id)),
    [ws, form.project_id]
  );

  const assignableUsers = useMemo(() => {
    if (!ws || !selectedProject) return [];
    if (canManageWork) return ws.users;

    const memberIds = new Set((selectedProject.members || []).map((member) => member.id));
    return ws.users.filter((candidate) => memberIds.has(candidate.id));
  }, [ws, selectedProject, canManageWork]);

  const projectLabels = useMemo(
    () => ws?.labels.filter((label) => !label.project_id || String(label.project_id) === String(form.project_id)) || [],
    [ws, form.project_id]
  );

  if (!open) return null;

  const selectProject = (projectId: string) => {
    setForm((current) => ({
      ...current,
      project_id: projectId,
      assignee_ids: [],
      label_ids: [],
    }));
  };

  const toggleAssignee = (id: number) => {
    setForm((current) => ({
      ...current,
      assignee_ids: current.assignee_ids.includes(id)
        ? current.assignee_ids.filter((userId) => userId !== id)
        : [...current.assignee_ids, id],
    }));
  };

  const assignToMe = () => {
    if (!user || !assignableUsers.some((candidate) => candidate.id === user.id)) return;
    setForm((current) => ({
      ...current,
      assignee_ids: current.assignee_ids.includes(user.id)
        ? current.assignee_ids
        : [user.id, ...current.assignee_ids],
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.project_id) return;

    setSaving(true);
    setError("");
    try {
      await createTask({
        ...form,
        project_id: Number(form.project_id),
        parent_id: form.parent_id || null,
        due_date: form.due_date || null,
        estimate_minutes: form.estimate_minutes ? Number(form.estimate_minutes) : null,
        recurrence_pattern: form.recurrence_pattern || null,
        recurrence_interval: Number(form.recurrence_interval) || 1,
      });
      setForm(blank(initialStatus, initialProjectId, parentId));
      onCreated();
      onClose();
    } catch (err: any) {
      const validation = err?.response?.data?.errors;
      setError(
        validation?.assignee_ids?.[0] ||
          validation?.project_id?.[0] ||
          err?.response?.data?.message ||
          "Could not create task."
      );
    } finally {
      setSaving(false);
    }
  };

  const noEligibleProjects = !loadingWorkspace && ws && eligibleProjects.length === 0;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="task-composer" onSubmit={submit}>
        <div className="composer-head">
          <div>
            <span className="eyebrow">{parentId ? "New subtask" : "New work item"}</span>
            <h2>{parentId ? "Create subtask" : "Create task"}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <AppIcon name="close" />
          </button>
        </div>

        {error && <div className="inline-error">{error}</div>}
        {noEligibleProjects && (
          <div className="inline-error">
            You are not a member of a project where you can create work yet. Ask a manager to add you to a project.
          </div>
        )}

        <label className="field-label">
          Task title
          <input
            autoFocus
            className="modern-input"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="What needs to get done?"
          />
        </label>

        <label className="field-label">
          Description
          <textarea
            className="modern-textarea"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Add context, acceptance criteria, links or notes…"
          />
        </label>

        <div className="composer-grid">
          <label className="field-label">
            Project
            <select
              disabled={!!initialProjectId || loadingWorkspace}
              className="modern-input"
              value={form.project_id}
              onChange={(event) => selectProject(event.target.value)}
            >
              <option value="">{loadingWorkspace ? "Loading projects…" : "Select project"}</option>
              {eligibleProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.key} · {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Priority
            <select className="modern-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className="field-label">
            Due date
            <input type="datetime-local" className="modern-input" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </label>

          <label className="field-label">
            Estimate (minutes)
            <input type="number" min="0" className="modern-input" value={form.estimate_minutes} onChange={(event) => setForm({ ...form, estimate_minutes: event.target.value })} placeholder="120" />
          </label>

          <label className="field-label">
            Repeat
            <select className="modern-input" value={form.recurrence_pattern} onChange={(event) => setForm({ ...form, recurrence_pattern: event.target.value })}>
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          {form.recurrence_pattern && (
            <label className="field-label">
              Every
              <input type="number" min="1" max="365" className="modern-input" value={form.recurrence_interval} onChange={(event) => setForm({ ...form, recurrence_interval: event.target.value })} />
              <small className="field-help">
                {form.recurrence_pattern === "daily" ? "day(s)" : form.recurrence_pattern === "weekly" ? "week(s)" : "month(s)"}
              </small>
            </label>
          )}
        </div>

        <div className="field-label">
          <div className="picker-heading">
            <span>Assignees</span>
            {user && assignableUsers.some((candidate) => candidate.id === user.id) && (
              <button type="button" className="text-button" onClick={assignToMe}>
                <AppIcon name="users" /> Assign to me
              </button>
            )}
          </div>
          {!form.project_id ? (
            <div className="field-help">Choose a project first to see people who can be assigned.</div>
          ) : (
            <div className="people-picker">
              {assignableUsers.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  className={form.assignee_ids.includes(candidate.id) ? "person-chip selected" : "person-chip"}
                  onClick={() => toggleAssignee(candidate.id)}
                >
                  <span>{candidate.name.charAt(0)}</span>
                  {candidate.name}
                  {candidate.id === user?.id ? " (you)" : ""}
                </button>
              ))}
              {!assignableUsers.length && <span className="field-help">No project members are available to assign.</span>}
            </div>
          )}
        </div>

        {!!form.project_id && !!projectLabels.length && (
          <div className="field-label">
            Labels
            <div className="people-picker">
              {projectLabels.map((label) => (
                <button
                  type="button"
                  key={label.id}
                  className={form.label_ids.includes(label.id) ? "label-picker selected" : "label-picker"}
                  onClick={() =>
                    setForm({
                      ...form,
                      label_ids: form.label_ids.includes(label.id)
                        ? form.label_ids.filter((id) => id !== label.id)
                        : [...form.label_ids, label.id],
                    })
                  }
                >
                  <i style={{ background: label.color }} />
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="composer-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" disabled={saving || !form.title.trim() || !form.project_id || !!noEligibleProjects}>
            {saving ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
