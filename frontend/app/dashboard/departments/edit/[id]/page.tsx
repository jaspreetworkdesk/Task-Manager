"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  getDepartment,
  updateDepartment,
} from "@/services/departmentService";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";

type FormErrors = {
  name?: string;
};

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();

  const departmentId = params.id as string;

  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDepartment = async () => {
    try {
      setLoading(true);

      const response = await getDepartment(departmentId);

      setName(response.data.name || "");
    } catch (error: any) {
      console.log(error);

      if (error.response?.status === 401) {
        Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (error.response?.status === 404) {
        Swal.fire("Not found", "Department not found.", "error");
        router.push("/dashboard/departments");
        return;
      }

      Swal.fire("Error", "Failed to fetch department.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartment();
  }, [departmentId]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Department name is required.";
    }

    if (name.trim().length > 100) {
      newErrors.name = "Department name must not be greater than 100 characters.";
    }

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
      setSaving(true);
      setErrors({});

      const data = {
        name: name.trim(),
      };

      await updateDepartment(departmentId, data);

      Swal.fire("Success", "Department updated successfully.", "success");

      router.push("/dashboard/departments");
    } catch (error: any) {
      console.log(error);

      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
        return;
      }

      if (error.response?.status === 401) {
        Swal.fire("Session expired", "Please login again.", "error");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      Swal.fire("Error", "Failed to update department.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6">Loading department...</p>;
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Department</h1>
        <p className="text-gray-500">
          Update department information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded">
        <FormInput
          label="Department Name"
          value={name}
          placeholder="Enter department name"
          error={errors.name}
          onChange={setName}
        />

        <div className="flex gap-3">
          <Button type="submit" loading={saving}>
            Update Department
          </Button>

          <Link
            href="/dashboard/departments"
            className="border px-5 py-3 rounded"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}