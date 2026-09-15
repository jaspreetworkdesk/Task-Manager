import api from "@/lib/axios";
export const getAdminDashboardStats = () => api.get("/admin/dashboard/stats");
export const getEmployeeDashboardStats = () => api.get("/dashboard/stats");
