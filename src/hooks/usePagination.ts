import { useState } from 'react';

interface PaginationOptions {
  pageSize: number;
  initialPage?: number;
}

export function usePagination<T>(
  data: T[] | undefined,
  options: PaginationOptions
) {
  const { pageSize, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalItems = data?.length ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data?.slice(startIndex, endIndex) || [];

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentData,
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex: Math.min(endIndex, totalItems),
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
