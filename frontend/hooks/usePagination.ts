import { useState } from "react";

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export const emptyPaginationMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

export default function usePagination(defaultPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(defaultPerPage);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta);

  const goToNextPage = () => {
    setCurrentPage((page) => {
      if (page >= meta.last_page) {
        return page;
      }

      return page + 1;
    });
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => {
      if (page <= 1) {
        return page;
      }

      return page - 1;
    });
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  const canGoNext = currentPage < meta.last_page;
  const canGoPrevious = currentPage > 1;

  return {
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
  };
}