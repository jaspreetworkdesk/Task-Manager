import api from "@/lib/axios";


/* =========================================
   TASK FILTERS
========================================== */

export type TaskFilters = {
  search?: string;

  status?: string;

  priority?: string;

  project_id?: number | string;

  employee_id?: number | string;

  department_id?: number | string;

  page?: number;

  per_page?: number;
};


/* =========================================
   TASK FORM DATA
========================================== */

export type TaskFormData = {
  title: string;

  description?: string | null;

  project_id?: number | null;

  employee_id?: number | null;

  department_id?: number | null;

  start_date?: string | null;

  due_date?: string | null;

  status: string;

  priority: string;
};


/* =========================================
   AUTH HEADERS
========================================== */

const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  return {
    Authorization: token
      ? `Bearer ${token}`
      : "",
    Accept: "application/json",
  };
};


/* =========================================
   CLEAN PARAMS
========================================== */

const cleanParams = (
  params: TaskFilters = {}
) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    )
  );
};


/* =========================================
   GET TASKS
========================================== */

export const getTasks = (
  params: TaskFilters = {}
) => {
  return api.get("/tasks", {
    params: cleanParams(params),

    headers: getAuthHeaders(),
  });
};


/* =========================================
   GET SINGLE TASK
========================================== */

export const getTask = (
  id: number | string
) => {
  return api.get(`/tasks/${id}`, {
    headers: getAuthHeaders(),
  });
};


/* =========================================
   CREATE TASK
========================================== */

export const createTask = (
  data: TaskFormData | { status: string }
) => {
  return api.post(
    "/tasks",
    data,
    {
      headers: getAuthHeaders(),
    }
  );
};


/* =========================================
   UPDATE TASK
========================================== */

export const updateTask = (
  id: number | string,
  data: TaskFormData | { status: string }
) => {
  return api.patch(
    `/tasks/${id}`,
    data,
    {
      headers: getAuthHeaders(),
    }
  );
};


/* =========================================
   DELETE TASK
========================================== */

export const deleteTask = (
  id: number | string
) => {
  return api.delete(
    `/tasks/${id}`,
    {
      headers: getAuthHeaders(),
    }
  );
};

/* =========================================
   Get Project Tasks
========================================== */



export const getProjectTasks = (
  params: TaskFilters = {},
  id: number | string
) => {
  return api.get(`/project-tasks/${id}`, {
    params: cleanParams(params),

    headers: getAuthHeaders(),
  });
};


