"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import Swal from "sweetalert2";

import { createDesignation } from "@/services/designationService";
import { getDepartments } from "@/services/departmentService";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";

type Department = {
  id: number;
  name: string;
};

type FormErrors = {
  name?: string;
  department_id?: string;
  description?: string;
};

type ApiErrorResponse = {
  message?: string;
  errors?: {
    name?: string[];
    department_id?: string[];
    description?: string[];
  };
};

export default function CreateDesignationPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleUnauthorized = useCallback(() => {
    Swal.fire("Session expired", "Please login again.", "error");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  }, [router]);

  const fetchDepartments = useCallback(async () => {
    try {
      setPageLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await getDepartments({
        page: 1,
        per_page: 100,
      });

      setDepartments(response.data.data || []);
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
      setPageLoading(false);
    }
  }, [router, handleUnauthorized]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Designation name is required.";
    } else if (name.trim().length > 100) {
      newErrors.name =
        "Designation name must not be greater than 100 characters.";
    }

   /* if (!departmentId) {
      newErrors.department_id = "Department is required.";
    }

    if (description.trim().length > 500) {
      newErrors.description =
        "Description must not be greater than 500 characters.";
    }
*/
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const data = {
        name: name.trim(),
        department_id: departmentId,
        description: description.trim() || undefined,
      };

      await createDesignation(data);

      Swal.fire("Success", "Designation created successfully.", "success");

      router.push("/dashboard/designations");
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 422) {
        const backendErrors = axiosError.response.data.errors;

        setErrors({
          name: backendErrors?.name?.[0],
          department_id: backendErrors?.department_id?.[0],
          description: backendErrors?.description?.[0],
        });

        return;
      }

      if (axiosError.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      if (axiosError.response?.status === 403) {
        Swal.fire(
          "Not allowed",
          "You are not allowed to create designations.",
          "error"
        );
        return;
      }

      Swal.fire(
        "Error",
        axiosError.response?.data.message || "Failed to create designation.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return <p className="p-6">Loading departments...</p>;
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Designation</h1>
        <p className="text-gray-500">
          Create a new employee job title and connect it with a department.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded">
        <FormInput
          label="Designation Name"
          value={name}
          placeholder="Enter designation name"
          error={errors.name}
          onChange={setName}
        />
  {/*
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Select department</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          {errors.department_id && (
            <p className="text-red-600 text-sm mt-1">{errors.department_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>

          <textarea
            value={description}
            placeholder="Enter designation description"
            onChange={(e) => setDescription(e.target.value)}
            className="border rounded px-3 py-2 w-full min-h-28"
          />

          {errors.description && (
            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
          )}
        </div>
        */}

        <div className="flex gap-3">
          <Button type="submit" loading={submitting}>
            Add Designation
          </Button>

          <Link
            href="/dashboard/designations"
            className="border px-5 py-3 rounded"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}