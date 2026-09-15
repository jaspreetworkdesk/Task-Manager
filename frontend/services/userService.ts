import api from "@/lib/axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
};

export type UserFilters = {
  search?: string;
  department_id?: string;
  designation_id?: string;
  status?: string;
  page?: number;
  per_page?: number;
};

export type UserFormData = {
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
};

const cleanParams = (params: UserFilters) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
};


export const getUserDetail = () => {
  return api.get(`/user-detail`, {
    headers: getAuthHeaders(),
  });
};

export const updateUser = (data: UserFormData) => {
  return api.patch(`/update-user-detail`, data, {
    headers: getAuthHeaders(),
  });
};
