"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import Swal from "sweetalert2";

import { deleteDepartment, getDepartments } from "@/services/departmentService";
import usePagination, {
  emptyPaginationMeta,
} from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/PaginationControls";
import useDebounce from "@/hooks/useDebounce";

type Department = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
};

type ApiErrorResponse = {
  message?: string;
};

export default function DepartmentsPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const {
    currentPage,
    setCurrentPage,
    recordsPerPage,
    meta,
    setMeta,
    resetPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePagination(10);

  const handleUnauthorized = useCallback(() => {
    Swal.fire("Session expired", "Please login again.", "error");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  }, [router]);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await getDepartments({
        search: debouncedSearch,
        page: currentPage,
        per_page: recordsPerPage,
      });

      setDepartments(response.data.data || []);
      setMeta(response.data.meta || emptyPaginationMeta);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      if (axiosError.response?.status === 403) {
        Swal.fire(
          "Not allowed",
          "You are not allowed to access departments.",
          "error"
        );
        return;
      }

      Swal.fire("Error", "Failed to fetch departments.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    router,
    debouncedSearch,
    currentPage,
    recordsPerPage,
    setMeta,
    handleUnauthorized,
  ]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const updateSearch = (value: string) => {
    setSearch(value);
    resetPage();
  };

  const resetFilters = () => {
    setSearch("");
    resetPage();
  };

  const handleDelete = async (department: Department) => {
    const result = await Swal.fire({
      title: "Delete department?",
      text: `Are you sure you want to delete ${department.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeletingId(department.id);

      await deleteDepartment(department.id);

      Swal.fire("Deleted", "Department deleted successfully.", "success");

      if (departments.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        return;
      }

      fetchDepartments();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      if (axiosError.response?.status === 422) {
        Swal.fire(
          "Cannot delete",
          axiosError.response.data.message ||
            "This department cannot be deleted because it is already used.",
          "error"
        );
        return;
      }

      Swal.fire("Error", "Failed to delete department.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && departments.length === 0) {
    return <p className="p-6">Loading departments...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-gray-500">
            Manage company departments used for employees and designations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/departments/create")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Department
        </button>
      </div>

      <div className="border rounded p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={search}
              placeholder="Search department"
              onChange={(e) => updateSearch(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

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
            Showing {departments.length} of {meta.total} departments
          </p>

          {loading && (
            <p className="text-sm text-gray-500">Updating results...</p>
          )}
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="border p-6 rounded text-center">
          <p className="text-gray-500">No departments found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Name</th>
                  {/*<th className="border p-3 text-left">Description</th>*/}
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td className="border p-3 font-medium">
                      {department.name}
                    </td>

                    {/*<td className="border p-3">
                      {department.description || "N/A"}
                    </td>
                      */
                    }
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/departments/edit/${department.id}`
                            )
                          }
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === department.id}
                          onClick={() => handleDelete(department)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                        >
                          {deletingId === department.id
                            ? "Deleting..."
                            : "Delete"}
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