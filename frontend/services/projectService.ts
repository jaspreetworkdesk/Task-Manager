import api from "@/lib/axios";


export type ProjectFilters = {
  search?: string;
  status?: string;
  priority?: string;
  department_id?: number | string;
  page?: number;
  per_page?: number;
};


export type ProjectFormData = {
  name: string;

  description?: string | null;

  department_id?: number | null;

  start_date?: string | null;

  due_date?: string | null;

  status: string;

  priority: string;
};


const getAuthHeaders = () => {

  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
};


const cleanParams = (
  params: ProjectFilters
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


export const getProjects = (
  params: ProjectFilters = {}
) => {

  return api.get("/projects", {

    params: cleanParams(params),

    headers: getAuthHeaders(),
  });
};


export const getProject = (
  id: number | string
) => {

  return api.get(`/projects/${id}`, {

    headers: getAuthHeaders(),
  });
};


export const createProject = (
  data: ProjectFormData
) => {

  return api.post(
    "/projects",
    data,
    {
      headers: getAuthHeaders(),
    }
  );
};


export const updateProject = (
  id: number | string,
  data: ProjectFormData
) => {

  return api.patch(
    `/projects/${id}`,
    data,
    {
      headers: getAuthHeaders(),
    }
  );
};


export const deleteProject = (
  id: number | string
) => {

  return api.delete(
    `/projects/${id}`,
    {
      headers: getAuthHeaders(),
    }
  );
};