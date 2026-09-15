import api from "@/lib/axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
};

export type DepartmentFilters = {
  search?: string;
  page?: number;
  per_page?: number;
};

export type DepartmentFormData = {
  name: string;
  description?: string;
};

const cleanParams = (params: DepartmentFilters) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
};

export const getDepartments = (params: DepartmentFilters = {}) => {
  return api.get("/departments", {
    params: cleanParams(params),
    headers: getAuthHeaders(),
  });
};

export const getDepartment = (id: string) => {
  return api.get(`/departments/${id}`, {
    headers: getAuthHeaders(),
  });
};

export const createDepartment = (data: DepartmentFormData) => {
  return api.post("/departments", data, {
    headers: getAuthHeaders(),
  });
};

export const updateDepartment = (id: string, data: DepartmentFormData) => {
  return api.patch(`/departments/${id}`, data, {
    headers: getAuthHeaders(),
  });
};

export const deleteDepartment = (id: number) => {
  return api.delete(`/departments/${id}`, {
    headers: getAuthHeaders(),
  });
};