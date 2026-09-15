"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import axios from "axios";
import Swal from "sweetalert2";

import {
  deleteTask,
  getTasks,
  getProjectTasks,
} from "@/services/taskService";

import usePagination, {
  emptyPaginationMeta,
} from "@/hooks/usePagination";

import PaginationControls from "@/components/ui/PaginationControls";
import useDebounce from "@/hooks/useDebounce";

/* =========================================
   TYPES
========================================== */

type User = {
  id: number;
  name: string;
};

type Employee = {
  id: number;
  user?: User | null;
};

type Project = {
  id: number;
  name: string;
};

type Task = {
  id: number;

  project_id?: number | string | null;
  employee_id?: number | string | null;
  created_by?: number | string | null;

  title: string;
  description?: string | null;

  status?: string | null;
  priority?: string | null;

  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;

  created_at?: string | null;

  /*
   * Relationships
   */
  project?: Project | null;
  assign_to?: Employee | null;
};

type ApiErrorResponse = {
  message?: string;
};


/* =========================================
   PAGE
========================================== */

export default function TasksPage() {
  const router = useRouter();

  /* =========================================
     STATE
  ========================================== */

  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");

    const params = useParams<{
      id: string;
    }>();
  
  
    const projectID = params.id;

  /* =========================================
     DEBOUNCED SEARCH
  ========================================== */

  const debouncedSearch =
    useDebounce(search, 500);


  /* =========================================
     PAGINATION
  ========================================== */

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


  /* =========================================
     UNAUTHORIZED
  ========================================== */

  const handleUnauthorized = useCallback(() => {
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
     FETCH TASKS
  ========================================== */

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }


  const response = await getProjectTasks(
    {
      search: debouncedSearch.trim() || undefined,
      page: currentPage,
      per_page: recordsPerPage,
    },
    projectID
  );

      setTasks(
        response.data?.data || []
      );

      setMeta(
        response.data?.meta ||
          emptyPaginationMeta
      );

    } catch (error: unknown) {
      console.error(
        "Failed to fetch tasks:",
        error
      );

      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        /* ===============================
           UNAUTHORIZED
        ================================ */

        if (
          error.response?.status === 401
        ) {
          handleUnauthorized();
          return;
        }


        /* ===============================
           FORBIDDEN
        ================================ */

        if (
          error.response?.status === 403
        ) {
          await Swal.fire(
            "Not allowed",
            "You are not allowed to access tasks.",
            "error"
          );

          return;
        }


        /* ===============================
           OTHER API ERROR
        ================================ */

        if (
          error.response?.data?.message
        ) {
          await Swal.fire(
            "Error",
            error.response.data.message,
            "error"
          );

          return;
        }
      }


      /* ===============================
         UNKNOWN ERROR
      ================================ */

      await Swal.fire(
        "Error",
        "Failed to fetch tasks.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    currentPage,
    recordsPerPage,
    setMeta,
    router,
    handleUnauthorized,
  ]);


  /* =========================================
     FETCH WHEN PAGE / SEARCH CHANGES
  ========================================== */

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);


  /* =========================================
     SEARCH
  ========================================== */

  const updateSearch = (
    value: string
  ) => {
    setSearch(value);

    /*
     * Always return to page 1
     * when search changes.
     */
    resetPage();
  };


  /* =========================================
     RESET FILTERS
  ========================================== */

  const resetFilters = () => {
    setSearch("");

    resetPage();
  };


  /* =========================================
     DELETE TASK
  ========================================== */

  const handleDelete = async (
    task: Task
  ) => {
    const result = await Swal.fire({
      title: "Delete task?",

      text:
        `Are you sure you want to delete "${task.title}"?`,

      icon: "warning",

      showCancelButton: true,

      confirmButtonText: "Yes, delete",

      cancelButtonText: "Cancel",

      confirmButtonColor: "#dc2626",
    });


    if (!result.isConfirmed) {
      return;
    }


    try {
      setDeletingId(task.id);

      await deleteTask(task.id);


      await Swal.fire(
        "Deleted",
        "Task deleted successfully.",
        "success"
      );


      /*
       * If current page has only one task
       * and we are not on page 1,
       * move back one page.
       */

      if (
        tasks.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage(
          currentPage - 1
        );

        return;
      }


      /*
       * Otherwise reload current page.
       */

      await fetchTasks();

    } catch (error: unknown) {
      console.error(
        "Failed to delete task:",
        error
      );


      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {

        /* ===============================
           UNAUTHORIZED
        ================================ */

        if (
          error.response?.status === 401
        ) {
          handleUnauthorized();
          return;
        }


        /* ===============================
           FORBIDDEN
        ================================ */

        if (
          error.response?.status === 403
        ) {
          await Swal.fire(
            "Not allowed",
            "You are not allowed to delete tasks.",
            "error"
          );

          return;
        }


        /* ===============================
           NOT FOUND
        ================================ */

        if (
          error.response?.status === 404
        ) {
          await Swal.fire(
            "Not found",
            "This task no longer exists.",
            "error"
          );

          await fetchTasks();

          return;
        }


        /* ===============================
           CANNOT DELETE
        ================================ */

        if (
          error.response?.status === 422 ||
          error.response?.status === 409
        ) {
          await Swal.fire(
            "Cannot delete",
            error.response.data?.message ||
              "This task cannot be deleted.",
            "error"
          );

          return;
        }


        /* ===============================
           OTHER API ERROR
        ================================ */

        if (
          error.response?.data?.message
        ) {
          await Swal.fire(
            "Error",
            error.response.data.message,
            "error"
          );

          return;
        }
      }


      /* ===============================
         UNKNOWN ERROR
      ================================ */

      await Swal.fire(
        "Error",
        "Failed to delete task.",
        "error"
      );

    } finally {
      setDeletingId(null);
    }
  };


  /* =========================================
     DISPLAY HELPERS
  ========================================== */

  const formatStatus = (
    value?: string | null
  ) => {
    if (!value) {
      return "N/A";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  const formatDate = (
    value?: string | null
  ) => {
    if (!value) {
      return "N/A";
    }

    return value;
  };


  /* =========================================
     INITIAL LOADING
  ========================================== */

  if (
    loading &&
    tasks.length === 0
  ) {
    return (
      <div className="p-6">
        <p>
          Loading tasks...
        </p>
      </div>
    );
  }


  /* =========================================
     PAGE
  ========================================== */

  return (
    <div className="p-6 space-y-6">


      {/* =====================================
          HEADER
      ====================================== */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-start
          sm:justify-between
          gap-4
        "
      >

        <div>

          <h1 className="text-2xl font-bold">
            Tasks
          </h1>

          <p className="text-gray-500">
            Create, manage, and track company tasks.
          </p>

        </div>


        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/tasks?project=${projectID}&create=1`
            )
          }
          className="
            bg-blue-600
            text-white
            px-4
            py-2
            rounded
            hover:bg-blue-700
          "
        >
          Add Task
        </button>

      </div>


      {/* =====================================
          SEARCH / FILTER
      ====================================== */}

      <div className="border rounded p-4 space-y-4">

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "
        >

          <div className="md:col-span-2">

            <label
              htmlFor="task-search"
              className="
                block
                text-sm
                font-medium
                mb-1
              "
            >
              Search
            </label>


            <input
              id="task-search"
              type="text"
              value={search}
              placeholder="Search tasks..."
              onChange={(e) =>
                updateSearch(
                  e.target.value
                )
              }
              className="
                border
                rounded
                px-3
                py-2
                w-full
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />

          </div>


          <div className="flex items-end">

            <button
              type="button"
              onClick={resetFilters}
              disabled={!search}
              className="
                bg-gray-200
                px-4
                py-2
                rounded
                w-full
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Reset Filters
            </button>

          </div>

        </div>


        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
          "
        >

          <p className="text-sm text-gray-500">

            Showing{" "}
            {tasks.length}{" "}
            of{" "}
            {meta.total}{" "}
            tasks

          </p>


          {loading && (
            <p className="text-sm text-gray-500">
              Updating results...
            </p>
          )}

        </div>

      </div>


      {/* =====================================
          EMPTY STATE
      ====================================== */}

      {tasks.length === 0 ? (

        <div
          className="
            border
            p-6
            rounded
            text-center
          "
        >

          <p className="text-gray-500">

            {debouncedSearch
              ? "No tasks match your search."
              : "No tasks found."}

          </p>

        </div>

      ) : (

        <>


          {/* =================================
              TASK TABLE
          ================================== */}

          <div
            className="
              border
              rounded
              overflow-x-auto
            "
          >

            <table className="w-full">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border p-3 text-left">
                    Task
                  </th>

                  <th className="border p-3 text-left">
                    Assign To
                  </th>

                  <th className="border p-3 text-left">
                    Status
                  </th>

                  <th className="border p-3 text-left">
                    Priority
                  </th>

                  <th className="border p-3 text-left">
                    Start Date
                  </th>

                  <th className="border p-3 text-left">
                    Due Date
                  </th>

                  <th className="border p-3 text-left">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {tasks.map(
                  (task) => (

                    <tr
                      key={task.id}
                      className="hover:bg-gray-50"
                    >


                      {/* =========================
                          TASK
                      ========================== */}

                      <td className="border p-3">

                        <div className="font-medium">
                          {task.title}
                        </div>


                        {task.project?.name && (

                          <div
                            className="
                              text-xs
                              text-gray-500
                              mt-1
                            "
                          >
                            Project:{" "}
                            {task.project.name}
                          </div>

                        )}


                        {task.description && (

                          <div
                            className="
                              text-xs
                              text-gray-400
                              mt-1
                              max-w-xs
                              truncate
                            "
                            title={
                              task.description
                            }
                          >
                            {task.description}
                          </div>

                        )}

                      </td>


                      {/* =========================
                          ASSIGN TO
                      ========================== */}

                      <td className="border p-3">

                        {task.assign_to?.user?.name ||
                          "Unassigned"}

                      </td>


                      {/* =========================
                          STATUS
                      ========================== */}

                      <td className="border p-3">

                        {formatStatus(
                          task.status
                        )}

                      </td>


                      {/* =========================
                          PRIORITY
                      ========================== */}

                      <td className="border p-3">

                        {formatStatus(
                          task.priority
                        )}

                      </td>


                      {/* =========================
                          START DATE
                      ========================== */}

                      <td className="border p-3">

                        {formatDate(
                          task.start_date
                        )}

                      </td>


                      {/* =========================
                          DUE DATE
                      ========================== */}

                      <td className="border p-3">

                        {formatDate(
                          task.due_date
                        )}

                      </td>


                      {/* =========================
                          ACTIONS
                      ========================== */}

                      <td className="border p-3">

                        <div className="flex gap-2">

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/tasks/edit/${task.id}`
                              )
                            }
                            className="
                              bg-blue-600
                              text-white
                              px-4
                              py-2
                              rounded
                              text-sm
                              hover:bg-blue-700
                            "
                          >
                            Edit
                          </button>


                          {/* DELETE */}

                          <button
                            type="button"
                            disabled={
                              deletingId ===
                              task.id
                            }
                            onClick={() =>
                              handleDelete(
                                task
                              )
                            }
                            className="
                              bg-red-600
                              text-white
                              px-3
                              py-2
                              rounded
                              text-sm
                              disabled:opacity-50
                              disabled:cursor-not-allowed
                              hover:bg-red-700
                            "
                          >

                            {deletingId ===
                              task.id
                              ? "Deleting..."
                              : "Delete"}

                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>


          {/* =================================
              PAGINATION
          ================================== */}

          <PaginationControls
            currentPage={
              meta.current_page
            }

            lastPage={
              meta.last_page
            }

            canGoPrevious={
              canGoPrevious
            }

            canGoNext={
              canGoNext
            }

            onPrevious={
              goToPreviousPage
            }

            onNext={
              goToNextPage
            }
          />

        </>

      )}

    </div>
  );
}