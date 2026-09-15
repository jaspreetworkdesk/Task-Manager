"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  deleteDesignation,
  getDesignations,
} from "@/services/designationService";
import { getDepartments } from "@/services/departmentService";
import usePagination, {
  emptyPaginationMeta,
} from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/PaginationControls";
import useDebounce from "@/hooks/useDebounce";

type Department = {
  id: number;
  name: string;
};

type Designation = {
  id: number;
  name: string;
  description?: string | null;
  employees_count?: number;
  department?: Department | null;
  created_at?: string;
};

export default function DesignationsPage() {
  const router = useRouter();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [departmentFilter, setDepartmentFilter] = useState("");

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

  const fetchDepartments = async () => {
    try {
      setDepartmentLoading(true);

      const response = await getDepartments({
        per_page: 100,
      });

      const responseData = response.data;

      if (Array.isArray(responseData)) {
        setDepartments(responseData);
      } else if (Array.isArray(responseData.data)) {
        setDepartments(responseData.data);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.log(error);
      setDepartments([]);
    } finally {
      setDepartmentLoading(false);
    }
  };

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await getDesignations({
        search: debouncedSearch,
        department_id: departmentFilter,
        page: currentPage,
        per_page: recordsPerPage,
      });

      console.log("Designations response:", response.data);

      setDesignations(response.data.data || []);
      setMeta(response.data.meta || emptyPaginationMeta);
    } catch (error: any) {
      console.log(error);

      if (error.response?.status === 401) {
        Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (error.response?.status === 403) {
        Swal.fire(
          "Not allowed",
          "You are not allowed to access designations.",
          "error"
        );
        return;
      }

      Swal.fire("Error", "Failed to fetch designations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [debouncedSearch, departmentFilter, currentPage]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    resetPage();
  };

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    resetPage();
  };

  const handleDelete = async (designation: Designation) => {
    const result = await Swal.fire({
      title: "Delete designation?",
      text: `Are you sure you want to delete ${designation.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteDesignation(designation.id);

      Swal.fire("Deleted", "Designation deleted successfully.", "success");

      fetchDesignations();
    } catch (error: any) {
      console.log(error);

      if (error.response?.status === 401) {
        Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (error.response?.status === 422) {
        Swal.fire(
          "Cannot delete",
          error.response.data.message ||
            "This designation cannot be deleted because it is already used.",
          "error"
        );
        return;
      }

      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to delete designation.",
        "error"
      );
    }
  };

  if (loading && designations.length === 0) {
    return <p className="p-6">Loading designations...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Designations</h1>
          <p className="text-gray-500">
            Manage job designations and connect them with departments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/designations/create")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Designation
        </button>
      </div>

      <div className="border rounded p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={search}
              placeholder="Search designation"
              onChange={(e) => updateFilter(setSearch, e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
{/*
          <div>
            <label className="block text-sm font-medium mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) =>
                updateFilter(setDepartmentFilter, e.target.value)
              }
              className="border rounded px-3 py-2 w-full"
            >
              <option value="">
                {departmentLoading ? "Loading..." : "All Departments"}
              </option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
*/}
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="bg-gray-200 px-4 py-2 rounded w-full"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing {designations.length} of {meta.total} designations
          </p>
          {loading && <span className="results-refreshing"><span className="loader-dot" />Updating results…</span>}
        </div>
      </div>

      {designations.length === 0 ? (
        <div className="border p-6 rounded text-center">
          <p className="text-gray-500">No designations found.</p>
        </div>
      ) : (
        <>
          <div className={`border rounded overflow-x-auto ${loading ? "results-updating" : ""}`}>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Name</th>
                {/*  <th className="border p-3 text-left">Department</th>
                  <th className="border p-3 text-left">Description</th>
                  <th className="border p-3 text-left">Employees</th>
                  */}
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {designations.map((designation) => (
                  <tr key={designation.id}>
                    <td className="border p-3 font-medium">
                      {designation.name}
                    </td>
 {/*  
                    <td className="border p-3">
                      {designation.department?.name || "-"}
                    </td>

                    <td className="border p-3">
                      {designation.description || "-"}
                    </td>

                    <td className="border p-3">
                      {designation.employees_count ?? "-"}
                    </td>
*/}
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/designations/edit/${designation.id}`
                            )
                          }
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(designation)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
          />
        </>
      )}
    </div>
  );
}