import api from "@/lib/axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
};

export type DesignationFilters = {
  search?: string;
  department_id?: string;
  page?: number;
  per_page?: number;
};

export type DesignationFormData = {
  name: string;
  department_id: string;
  description?: string;
};

const cleanParams = (params: DesignationFilters) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
};

export const getDesignations = (params: DesignationFilters = {}) => {
  return api.get("/designations", {
    params: cleanParams(params),
    headers: getAuthHeaders(),
  });
};

export const getDesignation = (id: string) => {
  return api.get(`/designations/${id}`, {
    headers: getAuthHeaders(),
  });
};

export const createDesignation = (data: DesignationFormData) => {
  return api.post("/designations", data, {
    headers: getAuthHeaders(),
  });
};

export const updateDesignation = (id: string, data: DesignationFormData) => {
  return api.patch(`/designations/${id}`, data, {
    headers: getAuthHeaders(),
  });
};

export const deleteDesignation = (id: number) => {
  return api.delete(`/designations/${id}`, {
    headers: getAuthHeaders(),
  });
};