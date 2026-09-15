import api from "@/lib/axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
};

export type EmployeeFilters = {
  search?: string;
  department_id?: string;
  designation_id?: string;
  status?: string;
  page?: number;
  per_page?: number;
};

export type EmployeeFormData = {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  employee_code?: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  joining_date?: string;
  status?: string;
  role?: "employee" | "manager";
  address?: string;
};

const cleanParams = (params: EmployeeFilters) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
};

export const getEmployees = (params: EmployeeFilters = {}) => {
  return api.get("/admin/employees", {
    params: cleanParams(params),
    headers: getAuthHeaders(),
  });
};

export const getEmployee = (id: string) => {
  return api.get(`/admin/employees/${id}`, {
    headers: getAuthHeaders(),
  });
};

export const createEmployee = (data: EmployeeFormData) => {
  return api.post("/admin/employees", data, {
    headers: getAuthHeaders(),
  });
};

export const updateEmployee = (id: string, data: EmployeeFormData) => {
  return api.patch(`/admin/employees/${id}`, data, {
    headers: getAuthHeaders(),
  });
};

export const deleteEmployee = (id: number) => {
  return api.delete(`/admin/employees/${id}`, {
    headers: getAuthHeaders(),
  });
};