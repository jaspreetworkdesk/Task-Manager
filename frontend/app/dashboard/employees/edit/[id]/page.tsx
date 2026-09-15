"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import Swal from "sweetalert2";

import { getEmployee, updateEmployee } from "@/services/employeeService";
import { getDepartments } from "@/services/departmentService";
import { getDesignations } from "@/services/designationService";

import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import FormTextarea from "@/components/ui/FormTextarea";
import Button from "@/components/ui/Button";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  employee_code?: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  joining_date?: string;
  address?: string;
};

type Department = {
  id: number;
  name: string;
};

type Designation = {
  id: number;
  name: string;
  department_id?: number | string;
  department?: Department | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  role?: "employee" | "manager";
};

type Employee = {
  id: number;
  user?: User | null;
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  employee_code?: string;
  phone?: string | null;
  department_id?: number | string;
  designation_id?: number | string;
  department?: Department | null;
  designation?: Designation | null;
  joining_date?: string | null;
  address?: string | null;
};

type ApiErrorResponse = {
  message?: string;
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    password_confirmation?: string[];
    employee_code?: string[];
    phone?: string[];
    department_id?: string[];
    designation_id?: string[];
    joining_date?: string[];
    address?: string[];
  };
};

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();

  const employeeId = params.id as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"employee" | "manager">("employee");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleUnauthorized = useCallback(() => {
    Swal.fire("Session expired", "Please login again.", "error");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  }, [router]);

  const fetchPageData = useCallback(async () => {
    try {
      setPageLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const [employeeResponse, departmentResponse, designationResponse] =
        await Promise.all([
          getEmployee(employeeId),
          getDepartments({
            page: 1,
            per_page: 100,
          }),
          getDesignations({
            page: 1,
            per_page: 100,
          }),
        ]);

      const employee: Employee =
        employeeResponse.data.data || employeeResponse.data;

      setName(employee.user?.name || employee.name || "");
      setEmail(employee.user?.email || employee.email || "");
      setRole(employee.user?.role || "employee");
      setEmployeeCode(employee.employee_code || "");
      setPassword(employee.password || "");
      setPasswordConfirmation(employee.password_confirmation || "");
      setPhone(employee.phone || "");

      setDepartmentId(
        employee.department_id
          ? String(employee.department_id)
          : employee.department?.id
          ? String(employee.department.id)
          : ""
      );

      setDesignationId(
        employee.designation_id
          ? String(employee.designation_id)
          : employee.designation?.id
          ? String(employee.designation.id)
          : ""
      );

      setJoiningDate(employee.joining_date || "");
      setAddress(employee.address || "");

      setDepartments(departmentResponse.data.data || []);
      setDesignations(designationResponse.data.data || []);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      if (axiosError.response?.status === 403) {
        Swal.fire(
          "Not allowed",
          "You are not allowed to access this page.",
          "error"
        );
        router.push("/dashboard/employees");
        return;
      }

      if (axiosError.response?.status === 404) {
        Swal.fire("Not found", "Employee not found.", "error");
        router.push("/dashboard/employees");
        return;
      }

      Swal.fire("Error", "Failed to fetch employee details.", "error");
    } finally {
      setPageLoading(false);
    }
  }, [employeeId, router, handleUnauthorized]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const validateFrontend = () => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

if (password.trim()) {
  if (password.length < 8) {
    newErrors.password = "Password must be at least 8 characters.";
  }

  if (!passwordConfirmation.trim()) {
    newErrors.password_confirmation = "Confirm password is required.";
  } else if (password !== passwordConfirmation) {
    newErrors.password_confirmation = "Password confirmation does not match.";
  }
}

    if (!employeeCode.trim()) {
      newErrors.employee_code = "Employee code is required.";
    }

    if (!departmentId) {
      newErrors.department_id = "Department is required.";
    }

    if (!designationId) {
      newErrors.designation_id = "Designation is required.";
    }

    if (address.trim().length > 1000) {
      newErrors.address = "Address must not be greater than 1000 characters.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    setDesignationId("");
  };

  const filteredDesignations = departmentId
    ? designations.filter((designation) => {
        if (!designation.department_id && !designation.department?.id) {
          return true;
        }

        const designationDepartmentId =
          designation.department_id || designation.department?.id;

        return String(designationDepartmentId) === departmentId;
      })
    : designations;

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isValid = validateFrontend();

    if (!isValid) {
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const token = localStorage.getItem("token");

      if (!token) {
        Swal.fire("Login required", "Please login again.", "error");
        router.push("/login");
        return;
      }

      const data = {
        name: name.trim(),
        email: email.trim(),
        employee_code: employeeCode.trim(),
        password_confirmation: passwordConfirmation.trim(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        department_id: departmentId,
        designation_id: designationId,
        joining_date: joiningDate || undefined,
        address: address.trim() || undefined,
        role,
      };

      await updateEmployee(employeeId, data);

      Swal.fire("Success", "Employee updated successfully.", "success");

      router.push("/dashboard/employees");
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 422) {
        const backendErrors = axiosError.response.data.errors;

        setErrors({
          name: backendErrors?.name?.[0],
          email: backendErrors?.email?.[0],
          employee_code: backendErrors?.employee_code?.[0],
          password: backendErrors?.password?.[0],
          password_confirmation: backendErrors?.password_confirmation?.[0],
          phone: backendErrors?.phone?.[0],
          department_id: backendErrors?.department_id?.[0],
          designation_id: backendErrors?.designation_id?.[0],
          joining_date: backendErrors?.joining_date?.[0],
          address: backendErrors?.address?.[0],
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
          "You are not allowed to update employees.",
          "error"
        );
        return;
      }

      Swal.fire(
        "Error",
        axiosError.response?.data.message ||
          "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return <p className="p-6">Loading employee details...</p>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Employee</h1>
        <p className="text-gray-500">
          Update employee login and profile details.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6 border p-6 rounded">
        <div>
          <h2 className="text-lg font-semibold mb-4">Login Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              value={name}
              placeholder="Enter employee name"
              error={errors.name}
              onChange={setName}
            />

            <FormInput
              label="Email"
              type="email"
              value={email}
              placeholder="Enter employee email"
              error={errors.email}
              onChange={setEmail}
            />

            <FormSelect
              label="Workspace Role"
              value={role}
              onChange={(value) => setRole(value as "employee" | "manager")}
              options={[
                { label: "Team member", value: "employee" },
                { label: "Manager — can manage projects & tasks", value: "manager" },
              ]}
            />

            <FormInput
              label="Password"
              type="password"
              value={password}
              placeholder="Minimum 8 characters"
              error={errors.password}
              onChange={setPassword}
            />

            <FormInput
              label="Confirm Password"
              type="password"
              value={passwordConfirmation}
              placeholder="Confirm password"
              error={errors.password_confirmation}
              onChange={setPasswordConfirmation}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Employee Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Employee Code"
              value={employeeCode}
              placeholder="EMP-001"
              error={errors.employee_code}
              onChange={setEmployeeCode}
            />

            <FormInput
              label="Phone"
              value={phone}
              placeholder="Enter phone number"
              error={errors.phone}
              onChange={setPhone}
            />

            <FormSelect
              label="Department"
              value={departmentId}
              error={errors.department_id}
              onChange={handleDepartmentChange}
              options={[
                { label: "Select department", value: "" },
                ...departments.map((department) => ({
                  label: department.name,
                  value: String(department.id),
                })),
              ]}
            />

            <FormSelect
              label="Designation"
              value={designationId}
              error={errors.designation_id}
              onChange={setDesignationId}
              options={[
                { label: "Select designation", value: "" },
                ...filteredDesignations.map((designation) => ({
                  label: designation.name,
                  value: String(designation.id),
                })),
              ]}
            />

            <FormInput
              label="Joining Date"
              type="date"
              value={joiningDate}
              error={errors.joining_date}
              onChange={setJoiningDate}
            />
          </div>

          <div className="mt-4">
            <FormTextarea
              label="Address"
              value={address}
              placeholder="Enter employee address"
              error={errors.address}
              onChange={setAddress}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={saving}>
            Update Employee
          </Button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/employees")}
            className="bg-gray-200 px-5 py-3 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}