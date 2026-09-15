"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { createDepartment } from "@/services/departmentService";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";

type FormErrors = {
  name?: string;
};

export default function CreateDepartmentPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      setErrors({});

      const data = {
        name: name.trim(),
      };

      await createDepartment(data);

      Swal.fire("Success", "Department created successfully.", "success");

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

      Swal.fire("Error", "Failed to create department.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Department</h1>
        <p className="text-gray-500">
          Create a new company department.
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
          <Button type="submit" loading={loading}>
            Add Department
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