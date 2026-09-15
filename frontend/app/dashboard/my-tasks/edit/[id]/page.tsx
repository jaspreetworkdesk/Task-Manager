"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import axios from "axios";
import Swal from "sweetalert2";

import {
  getTask,
  updateTask,
} from "@/services/taskService";

import {
  getEmployees,
} from "@/services/employeeService";

import {
  getProjects,
} from "@/services/projectService";

import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import FormTextarea from "@/components/ui/FormTextarea";
import Button from "@/components/ui/Button";

import type {
  TaskFormData,
} from "@/services/taskService";


/* =========================================
   TYPES
========================================== */

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


type Task = {
  id: number;

  title: string;

  description?: string | null;

  project_id: number;

  employee_id?: number | null;

  status: string;

  priority: string;

  start_date?: string | null;

  due_date?: string | null;
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


/* =========================================
   PAGE
========================================== */

export default function EditTaskPage() {

  const router = useRouter();


  const params = useParams<{
    id: string;
  }>();


  const taskId = params.id;


  /* =========================================
     FORM STATE
  ========================================== */

  const [title, setTitle] =
    useState("");

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
     DATA STATE
  ========================================== */

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);


  /* =========================================
     UI STATE
  ========================================== */

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [pageLoading, setPageLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


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
     DATE HELPERS
  ========================================== */

  const formatDateForInput = (
    value?: string | null
  ) => {

    if (!value) {
      return "";
    }

    return value.substring(0, 10);
  };


  const formatDateTimeForInput = (
    value?: string | null
  ) => {

    if (!value) {
      return "";
    }


    /*
     * Example Laravel value:
     *
     * 2026-08-28T18:00:00.000000Z
     *
     * datetime-local expects:
     *
     * 2026-08-28T18:00
     */

    return value.substring(0, 16);
  };


  /* =========================================
     LOAD TASK + DROPDOWNS
  ========================================== */

  const fetchPageData =
    useCallback(async () => {

      try {

        setPageLoading(true);


        const token =
          localStorage.getItem("token");


        if (!token) {

          router.replace("/login");

          return;
        }


        const [
          taskResponse,
          employeeResponse,
          projectResponse,
        ] = await Promise.all([

          getTask(taskId),

          getEmployees({
            page: 1,
            per_page: 100,
          }),

          getProjects({
            page: 1,
            per_page: 100,
          }),

        ]);


        /*
         * Supports either:
         *
         * response.data
         *
         * OR
         *
         * response.data.data
         */

        const responseData =
          taskResponse.data;


        const task: Task =
          responseData.data ??
          responseData;


        /* =====================================
           FILL EXISTING VALUES
        ====================================== */

        setTitle(
          task.title || ""
        );


        setDescription(
          task.description || ""
        );


        setProjectId(
          task.project_id
            ? String(task.project_id)
            : ""
        );


        setEmployeeId(
          task.employee_id
            ? String(task.employee_id)
            : ""
        );


        setStatus(
          task.status || "todo"
        );


        setPriority(
          task.priority || "medium"
        );


        setStartDate(
          formatDateForInput(
            task.start_date
          )
        );


        setDueDate(
          formatDateTimeForInput(
            task.due_date
          )
        );


        /* =====================================
           DROPDOWNS
        ====================================== */

        setEmployees(
          employeeResponse.data.data ||
            []
        );


        setProjects(
          projectResponse.data.data ||
            []
        );

      } catch (error: unknown) {

        console.error(error);


        if (
          axios.isAxiosError<ApiErrorResponse>(
            error
          )
        ) {

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
              "You are not allowed to edit this task.",
              "error"
            );


            router.push(
              "/dashboard/tasks"
            );

            return;
          }


          if (
            error.response?.status === 404
          ) {

            await Swal.fire(
              "Not found",
              "Task not found.",
              "error"
            );


            router.push(
              "/dashboard/tasks"
            );

            return;
          }

        }


        await Swal.fire(
          "Error",
          "Failed to load task information.",
          "error"
        );

      } finally {

        setPageLoading(false);
      }

    }, [
      taskId,
      router,
      handleUnauthorized,
    ]);


  useEffect(() => {

    if (taskId) {
      fetchPageData();
    }

  }, [
    taskId,
    fetchPageData,
  ]);


  /* =========================================
     VALIDATION
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
     UPDATE
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

      setSaving(true);

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


      await updateTask(
        taskId,
        data
      );


      await Swal.fire(
        "Success",
        "Task updated successfully.",
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
            "You are not allowed to update this task.",
            "error"
          );

          return;
        }


        if (
          error.response?.status === 404
        ) {

          await Swal.fire(
            "Not found",
            "This task no longer exists.",
            "error"
          );


          router.push(
            "/dashboard/tasks"
          );

          return;
        }

      }


      await Swal.fire(
        "Error",
        "Failed to update task.",
        "error"
      );

    } finally {

      setSaving(false);
    }
  };


  /* =========================================
     LOADING
  ========================================== */

  if (pageLoading) {

    return (
      <p className="p-6">
        Loading task...
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
          Edit Task
        </h1>

        <p className="text-gray-500">
          Update task information.
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


        {/* START */}

        <FormInput
          label="Start Date"
          type="date"
          value={startDate}
          error={errors.start_date}
          onChange={setStartDate}
        />


        {/* DUE */}

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
            loading={saving}
          >
            Update Task
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