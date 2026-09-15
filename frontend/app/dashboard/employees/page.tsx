"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { deleteEmployee, getEmployees } from "@/services/employeeService";
import { getDepartments } from "@/services/departmentService";
import { getDesignations } from "@/services/designationService";
import useDebounce from "@/hooks/useDebounce";
import usePagination, { emptyPaginationMeta } from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/PaginationControls";

type User = { id: number; name: string; email: string };
type Department = { id: number; name: string };
type Designation = { id: number; name: string };
type Employee = {
  id: number;
  user_id?: number;
  employee_code?: string;
  phone?: string;
  joining_date?: string;
  user?: User | null;
  department?: Department | null;
  designation?: Designation | null;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 280);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const {
    currentPage,
    recordsPerPage,
    meta,
    setMeta,
    resetPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePagination(10);

  useEffect(() => {
    let cancelled = false;
    async function fetchDropdownData() {
      try {
        setDropdownLoading(true);
        const [departmentResponse, designationResponse] = await Promise.all([
          getDepartments({ per_page: 100 }),
          getDesignations({ per_page: 100 }),
        ]);
        if (cancelled) return;
        const departmentData = departmentResponse.data;
        const designationData = designationResponse.data;
        setDepartments(Array.isArray(departmentData) ? departmentData : departmentData.data || []);
        setDesignations(Array.isArray(designationData) ? designationData : designationData.data || []);
      } catch {
        if (!cancelled) {
          setDepartments([]);
          setDesignations([]);
        }
      } finally {
        if (!cancelled) setDropdownLoading(false);
      }
    }
    void fetchDropdownData();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchEmployees = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (hasLoaded.current) setRefreshing(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await getEmployees({
        search: debouncedSearch.trim() || undefined,
        department_id: departmentFilter || undefined,
        designation_id: designationFilter || undefined,
        page: currentPage,
        per_page: recordsPerPage,
      });

      if (currentRequest !== requestId.current) return;
      setEmployees(response.data.data || []);
      setMeta(response.data.meta || emptyPaginationMeta);
    } catch (error: any) {
      if (currentRequest !== requestId.current) return;
      if (error.response?.status === 401) {
        await Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }
      if (error.response?.status === 403) {
        await Swal.fire("Not allowed", "You are not allowed to access employees.", "error");
        return;
      }
      await Swal.fire("Error", "Failed to fetch employees.", "error");
    } finally {
      if (currentRequest === requestId.current) {
        hasLoaded.current = true;
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, departmentFilter, designationFilter, currentPage, recordsPerPage, router, setMeta]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    resetPage();
  };

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setDesignationFilter("");
    resetPage();
  };

  const handleDelete = async (employee: Employee) => {
    const result = await Swal.fire({
      title: "Delete employee?",
      text: `Are you sure you want to delete ${employee.user?.name || "this employee"}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteEmployee(employee.id);
      await Swal.fire("Deleted", "Employee deleted successfully.", "success");
      void fetchEmployees();
    } catch (error: any) {
      if (error.response?.status === 401) {
        await Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }
      await Swal.fire("Error", error.response?.data?.message || "Failed to delete employee.", "error");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Employees</h1><p className="text-gray-500">Manage employee records, departments, and designations.</p></div>
        <button type="button" onClick={() => router.push("/dashboard/employees/create")} className="bg-blue-600 text-white px-4 py-2 rounded">Add Employee</button>
      </div>

      <div className="border rounded p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium mb-1">Search</label><input type="text" value={search} placeholder="Name, email, code" onChange={(event) => updateFilter(setSearch, event.target.value)} className="border rounded px-3 py-2 w-full" /></div>
          <div><label className="block text-sm font-medium mb-1">Department</label><select value={departmentFilter} onChange={(event) => updateFilter(setDepartmentFilter, event.target.value)} className="border rounded px-3 py-2 w-full"><option value="">{dropdownLoading ? "Loading..." : "All Departments"}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Designation</label><select value={designationFilter} onChange={(event) => updateFilter(setDesignationFilter, event.target.value)} className="border rounded px-3 py-2 w-full"><option value="">{dropdownLoading ? "Loading..." : "All Designations"}</option>{designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}</select></div>
          <div className="flex items-end"><button type="button" onClick={resetFilters} className="bg-gray-200 px-4 py-2 rounded w-full">Reset Filters</button></div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
          <span>Showing {employees.length} of {meta.total} employees</span>
          {refreshing && <span className="results-refreshing"><span className="loader-dot" />Updating results…</span>}
        </div>
      </div>

      {initialLoading ? (
        <div className="border p-6 rounded">Loading employees...</div>
      ) : employees.length === 0 ? (
        <div className="border p-6 rounded text-center"><p className="text-gray-500">No employees found.</p></div>
      ) : (
        <>
          <div className={`border rounded overflow-x-auto ${refreshing ? "results-updating" : ""}`}>
            <table className="w-full">
              <thead><tr className="bg-gray-100"><th className="border p-3 text-left">Employee</th><th className="border p-3 text-left">Code</th><th className="border p-3 text-left">Phone</th><th className="border p-3 text-left">Department</th><th className="border p-3 text-left">Designation</th><th className="border p-3 text-left">Joining Date</th><th className="border p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="border p-3"><div><p className="font-medium">{employee.user?.name || "-"}</p><p className="text-sm text-gray-500">{employee.user?.email || "-"}</p></div></td>
                    <td className="border p-3">{employee.employee_code || "-"}</td>
                    <td className="border p-3">{employee.phone || "-"}</td>
                    <td className="border p-3">{employee.department?.name || "-"}</td>
                    <td className="border p-3">{employee.designation?.name || "-"}</td>
                    <td className="border p-3">{employee.joining_date || "-"}</td>
                    <td className="border p-3"><div className="flex gap-2"><button type="button" onClick={() => router.push(`/dashboard/employees/edit/${employee.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded">Edit</button><button type="button" onClick={() => handleDelete(employee)} className="bg-red-600 text-white px-3 py-2 rounded text-sm">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls currentPage={meta.current_page} lastPage={meta.last_page} canGoPrevious={canGoPrevious} canGoNext={canGoNext} onPrevious={goToPreviousPage} onNext={goToNextPage} />
        </>
      )}
    </div>
  );
}
