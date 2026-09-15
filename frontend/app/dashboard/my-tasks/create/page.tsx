"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import axios from "axios";
import Swal from "sweetalert2";

import { createTask } from "@/services/taskService";
import { getEmployees } from "@/services/employeeService";
import { getProjects } from "@/services/projectService";

import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import FormTextarea from "@/components/ui/FormTextarea";
import Button from "@/components/ui/Button";

import type { TaskFormData } from "@/services/taskService";


type FormErrors = {
  title?: string;
  description?: string;
  project_id?: string;
  employee_id?: string;
  start_date?: string;
  due_date?: string;
  status?: string;
  priority?: string;
};


type Employee = {
  id: number;

  user: {
    id: number;
    name: string;
  };
};


type Project = {
  id: number;
  name: string;
};


type ApiErrorResponse = {
  message?: string;

  errors?: {
    title?: string[];
    description?: string[];
    project_id?: string[];
    employee_id?: string[];
    start_date?: string[];
    due_date?: string[];
    status?: string[];
    priority?: string[];
  };
};


export default function CreateTaskPage() {
  const router = useRouter();


  /* =========================================
     FORM STATE
  ========================================== */

  const [title, setTitle] = useState("");

  const [description, setDescription] =
    useState("");

  const [projectId, setProjectId] =
    useState("");

  const [employeeId, setEmployeeId] =
    useState("");

  const [status, setStatus] =
    useState("todo");

  const [priority, setPriority] =
    useState("medium");

  const [startDate, setStartDate] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");


  /* =========================================
     UI STATE
  ========================================== */

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(true);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);


  /* =========================================
     UNAUTHORIZED
  ========================================== */

  const handleUnauthorized =
    useCallback(() => {

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      Swal.fire(
        "Session expired",
        "Please login again.",
        "error"
      ).then(() => {
        router.replace("/login");
      });

    }, [router]);


  /* =========================================
     LOAD DROPDOWN DATA
  ========================================== */

  const fetchDropdownData =
    useCallback(async () => {

      try {
        setPageLoading(true);

        const token =
          localStorage.getItem("token");

        if (!token) {
          router.replace("/login");
          return;
        }


        /*
         * Both requests are independent,
         * so load them at the same time.
         */
        const [
          employeeResponse,
          projectResponse,
        ] = await Promise.all([
          getEmployees({
            page: 1,
            per_page: 100,
          }),

          getProjects({
            page: 1,
            per_page: 100,
          }),
        ]);


        setEmployees(
          employeeResponse.data.data || []
        );

        setProjects(
          projectResponse.data.data || []
        );

      } catch (error: unknown) {

        console.error(error);

        if (
          axios.isAxiosError<ApiErrorResponse>(
            error
          )
        ) {

          if (error.response?.status === 401) {
            handleUnauthorized();
            return;
          }


          if (error.response?.status === 403) {

            await Swal.fire(
              "Not allowed",
              "You are not allowed to access task form data.",
              "error"
            );

            return;
          }
        }


        await Swal.fire(
          "Error",
          "Failed to load task form data.",
          "error"
        );

      } finally {
        setPageLoading(false);
      }

    }, [router, handleUnauthorized]);


  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);


  /* =========================================
     CLIENT VALIDATION
  ========================================== */

  const validateForm = (): FormErrors => {

    const newErrors: FormErrors = {};


    if (!title.trim()) {

      newErrors.title =
        "Task title is required.";

    } else if (
      title.trim().length > 255
    ) {

      newErrors.title =
        "Task title must not be greater than 255 characters.";
    }


    /*
     * Project is required in your database.
     */
    if (!projectId) {
      newErrors.project_id =
        "Project is required.";
    }


    if (!status) {
      newErrors.status =
        "Task status is required.";
    }


    if (!priority) {
      newErrors.priority =
        "Task priority is required.";
    }


    if (
      startDate &&
      dueDate &&
      new Date(dueDate) <
        new Date(startDate)
    ) {

      newErrors.due_date =
        "Due date must be on or after the start date.";
    }


    return newErrors;
  };


  /* =========================================
     LARAVEL VALIDATION ERRORS
  ========================================== */

  const getValidationErrors = (
    apiErrors?: ApiErrorResponse["errors"]
  ): FormErrors => {

    if (!apiErrors) {
      return {};
    }


    return {
      title:
        apiErrors.title?.[0],

      description:
        apiErrors.description?.[0],

      project_id:
        apiErrors.project_id?.[0],

      employee_id:
        apiErrors.employee_id?.[0],

      start_date:
        apiErrors.start_date?.[0],

      due_date:
        apiErrors.due_date?.[0],

      status:
        apiErrors.status?.[0],

      priority:
        apiErrors.priority?.[0],
    };
  };


  /* =========================================
     SUBMIT
  ========================================== */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();


    const validationErrors =
      validateForm();


    if (
      Object.keys(validationErrors).length > 0
    ) {

      setErrors(validationErrors);

      return;
    }


    try {

      setLoading(true);

      setErrors({});


      const data: TaskFormData = {

        title:
          title.trim(),

        description:
          description.trim() || null,

        project_id:
          Number(projectId),

        employee_id:
          employeeId
            ? Number(employeeId)
            : null,

        start_date:
          startDate || null,

        due_date:
          dueDate || null,

        status,

        priority,
      };


      await createTask(data);


      await Swal.fire(
        "Success",
        "Task created successfully.",
        "success"
      );


      router.push(
        "/dashboard/tasks"
      );

    } catch (error: unknown) {

      console.error(error);


      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {

        if (
          error.response?.status === 422
        ) {

          setErrors(
            getValidationErrors(
              error.response.data.errors
            )
          );

          return;
        }


        if (
          error.response?.status === 401
        ) {

          handleUnauthorized();

          return;
        }


        if (
          error.response?.status === 403
        ) {

          await Swal.fire(
            "Not allowed",
            "You are not allowed to create tasks.",
            "error"
          );

          return;
        }
      }


      await Swal.fire(
        "Error",
        "Failed to create task.",
        "error"
      );

    } finally {

      setLoading(false);
    }
  };


  /* =========================================
     LOADING
  ========================================== */

  if (pageLoading) {

    return (
      <p className="p-6">
        Loading task form...
      </p>
    );
  }


  /* =========================================
     PAGE
  ========================================== */

  return (

    <div className="p-6 max-w-xl space-y-6">

      <div>

        <h1 className="text-2xl font-bold">
          Add Task
        </h1>

        <p className="text-gray-500">
          Create a new company task.
        </p>

      </div>


      <form
        onSubmit={handleSubmit}
        className="space-y-4 border p-6 rounded"
      >


        <FormInput
          label="Task Title"
          value={title}
          placeholder="Enter task title"
          error={errors.title}
          onChange={setTitle}
        />


        <FormTextarea
          label="Description"
          value={description}
          placeholder="Enter task description"
          error={errors.description}
          onChange={setDescription}
        />


        {/* PROJECT */}

        <FormSelect
          label="Project"
          value={projectId}
          error={errors.project_id}
          onChange={setProjectId}
          options={[
            {
              label: "Select project",
              value: "",
            },

            ...projects.map(
              (project) => ({
                label: project.name,
                value: String(project.id),
              })
            ),
          ]}
        />


        {/* EMPLOYEE */}

        <FormSelect
          label="Employee"
          value={employeeId}
          error={errors.employee_id}
          onChange={setEmployeeId}
          options={[
            {
              label: "Unassigned",
              value: "",
            },

            ...employees.map(
              (employee) => ({
                label:
                  employee.user?.name ||
                  `Employee #${employee.id}`,

                value:
                  String(employee.id),
              })
            ),
          ]}
        />


        {/* STATUS */}

        <FormSelect
          label="Status"
          value={status}
          error={errors.status}
          onChange={setStatus}
          options={[
            {
              label: "To Do",
              value: "todo",
            },
            {
              label: "In Progress",
              value: "in_progress",
            },
            {
              label: "Review",
              value: "review",
            },
            {
              label: "Completed",
              value: "completed",
            },
            {
              label: "Cancelled",
              value: "cancelled",
            },
          ]}
        />


        {/* PRIORITY */}

        <FormSelect
          label="Priority"
          value={priority}
          error={errors.priority}
          onChange={setPriority}
          options={[
            {
              label: "Low",
              value: "low",
            },
            {
              label: "Medium",
              value: "medium",
            },
            {
              label: "High",
              value: "high",
            },
            {
              label: "Urgent",
              value: "urgent",
            },
          ]}
        />


        {/* START DATE */}

        <FormInput
          label="Start Date"
          type="date"
          value={startDate}
          error={errors.start_date}
          onChange={setStartDate}
        />


        {/* DUE DATE */}

        <FormInput
          label="Due Date"
          type="datetime-local"
          value={dueDate}
          error={errors.due_date}
          onChange={setDueDate}
        />


        <div className="flex gap-3">

          <Button
            type="submit"
            loading={loading}
          >
            Add Task
          </Button>


          <Link
            href="/dashboard/tasks"
            className="border px-5 py-3 rounded"
          >
            Cancel
          </Link>

        </div>

      </form>

    </div>
  );
}