'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Course {
  id: string
  name: string
  slug: string
  thumbnail: string | null
  description: string | null
  path: string
  createdAt: string
  updatedAt: string
  _count: { modules: number; lessons: number }
  progress: {
    completedLessons: number
    totalLessons: number
    percentage: number
    lastWatched: string | null
  }
  coverClass?: string
}

interface CoursesResponse {
  courses: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface UseCoursesOptions {
  initialPage?: number
  initialLimit?: number
  initialSearch?: string
  initialFilter?: string
  initialSortBy?: string
  initialSortOrder?: string
}

export function useCourses(options: UseCoursesOptions = {}) {
  const [courses, setCourses] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: options.initialPage || 1,
    limit: options.initialLimit || 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [search, setSearch] = useState(options.initialSearch || '')
  const [filter, setFilter] = useState(options.initialFilter || 'all')
  const [sortBy, setSortBy] = useState(options.initialSortBy || 'updatedAt')
  const [sortOrder, setSortOrder] = useState(options.initialSortOrder || 'desc')
  const [debouncedSearch, setDebouncedSearch] = useState(options.initialSearch || '')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      search: debouncedSearch,
      filter,
      sortBy,
      sortOrder,
    })

    try {
      const response = await fetch(`/api/courses?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      const data = await response.json()
      setCourses(data.courses)
      setTags(data.tags || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNext: data.pagination.hasNext,
        hasPrev: data.pagination.hasPrev,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, filter, sortBy, sortOrder])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const nextPage = () => {
    if (pagination.hasNext) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }))
    }
  }

  const prevPage = () => {
    if (pagination.hasPrev) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }))
    }
  }

  const changeLimit = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  const handleFilter = (value: string) => {
    setFilter(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSort = (field: string) => {
    setSortBy(field)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return {
    courses,
    tags,
    loading,
    error,
    pagination,
    search,
    setSearch: handleSearch,
    filter,
    setFilter: handleFilter,
    sortBy,
    sortOrder,
    setSortBy: handleSort,
    setSortOrder: toggleSortOrder,
    toggleSortOrder,
    goToPage,
    nextPage,
    prevPage,
    changeLimit,
    refetch: fetchCourses,
  }
}