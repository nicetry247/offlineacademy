'use client'

import * as React from 'react'
import { CourseCard } from '@/components/CourseCard'
import { Header } from '@/components/Header'
import { BookOpen, Plus, Search, Filter, Settings, Play, Clock, CheckCircle, BarChart3, Zap, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { formatTime } from '@/lib/utils'
import { useCourses } from '@/lib/hooks/useCourses'
import { getCourseDisplayName } from '@/lib/course-display'

export default function Dashboard() {
  const { 
    courses,
    tags,
    loading,
    error,
    pagination,
    search,
    setSearch,
    filter,
    setFilter,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    nextPage, 
    prevPage, 
    changeLimit,
    goToPage,
    refetch,
    toggleSortOrder,
  } = useCourses({ initialLimit: 12 })
  
  const [continueWatching, setContinueWatching] = React.useState<any[]>([])
  const [completedCourses, setCompletedCourses] = React.useState<any[]>([])
  const [cwLoading, setCwLoading] = React.useState(true)
  const [ccLoading, setCcLoading] = React.useState(true)
  const categoryTags = React.useMemo(
    () => tags.filter((tag: any) => tag.name.startsWith('category:')),
    [tags]
  )
  const plainTags = React.useMemo(
    () => tags.filter((tag: any) => !tag.name.startsWith('category:')),
    [tags]
  )

  React.useEffect(() => {
    const fetchContinueWatching = async () => {
      try {
        const res = await fetch('/api/progress?type=continue')
        const data = await res.json()
        setContinueWatching(data.items || data)
      } catch (e) {
        console.error('Failed to fetch continue watching:', e)
      } finally {
        setCwLoading(false)
      }
    }
    
    const fetchCompletedCourses = async () => {
      try {
        const res = await fetch('/api/progress?type=completed')
        const data = await res.json()
        setCompletedCourses(data.items || data)
      } catch (e) {
        console.error('Failed to fetch completed courses:', e)
      } finally {
        setCcLoading(false)
      }
    }

    fetchContinueWatching()
    fetchCompletedCourses()
  }, [])

  const getVideoThumb = (lessonType: string, courseName: string) => {
    const name = courseName.toLowerCase()
    if (name.includes('linux') || name.includes('terraform')) return 'video-thumb-linux'
    if (name.includes('code') || name.includes('program')) return 'video-thumb-code'
    if (name.includes('automat') || name.includes('workflow')) return 'video-thumb-flow'
    return 'video-thumb-presenter'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearchFilter={false} showScanButtons={true} coffeeUrl="https://ko-fi.com/nicetry247" />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading courses...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearchFilter={false} showScanButtons={true} coffeeUrl="https://ko-fi.com/nicetry247" />
        <main className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-6 p-8 bg-muted/50 rounded-full glass-card">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No courses found</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add course folders to your <code className="bg-muted px-1.5 py-0.5 rounded">My_Courses/</code> directory, following the scan page folder structure, then scan to populate your library.
            </p>
            <Link href="/scan">
              <Button size="lg" className="gap-2 btn-premium-primary">
                <Plus className="h-5 w-5" />
                Scan for Courses
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearchFilter={false} showScanButtons={true} coffeeUrl="https://ko-fi.com/nicetry247" />

      {/* Stats Bar */}
      <div className="border-b border-white/5">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            {/* Search/Filter bar */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-[160px]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="favorites">Pinned Favorites</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  {categoryTags.length > 0 && (
                    <>
                      {categoryTags.map((tag: any) => (
                        <SelectItem key={tag.id} value={`tag:${tag.id}`}>
                          Category: {tag.name.replace(/^category:/, '')}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {plainTags.length > 0 && (
                    <>
                      {plainTags.map((tag: any) => (
                        <SelectItem key={tag.id} value={`tag:${tag.id}`}>
                          Tag: {tag.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-[160px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Recently Updated</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="header-control"
                onClick={toggleSortOrder}
                aria-label="Sort"
              >
                {sortOrder === 'asc' ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 ml-auto">
              <div className="stat-badge">
                <span className="stat-badge-icon"><BarChart3 className="h-4 w-4" /></span>
                <span>{pagination.total} courses</span>
              </div>
              <div className="stat-badge">
                <span className="stat-badge-icon-accent"><Zap className="h-4 w-4" /></span>
                <span>{courses.reduce((sum, c) => sum + c._count.lessons, 0)} lessons</span>
              </div>
              <div className="stat-badge">
                <span className="stat-badge-icon-green"><CheckCircle className="h-4 w-4" /></span>
                <span className="text-green-400">{courses.filter(c => c.progress.percentage === 100 && c._count.lessons > 0).length} completed</span>
              </div>
              <div className="stat-badge">
                <span className="stat-badge-icon-blue"><Play className="h-4 w-4" /></span>
                <span className="text-blue-400">{courses.filter(c => c.progress.percentage > 0 && c.progress.percentage < 100).length} in progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Continue Watching */}
        {!cwLoading && continueWatching.length > 0 && search.trim() === '' && (
          <section className="mb-8" aria-labelledby="continue-watching-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="continue-watching-heading" className="text-xl font-semibold flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                Continue Watching
              </h2>
            </div>
            <ScrollArea type="always" className="h-auto">
              <div className="flex gap-4 pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }} role="list">
                {continueWatching.slice(0, 1).map((item, index) => {
                  const courseTitle = getCourseDisplayName(item.course)
                  const thumbClass = getVideoThumb(item.lesson.type, courseTitle)
                  return (
                    <Link
                      key={item.lesson.id + '-' + index}
                      href={'/watch/' + item.lesson.id + '?course=' + item.course.slug}
                      className="flex-none w-72 sm:w-80 snap-start group"
                    >
                      <Card className="glass-card-elevated h-full overflow-hidden transition-all hover:glow-primary group">
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          <div className={'video-thumb ' + thumbClass + ' w-full h-full transition-transform duration-500 group-hover:scale-105'} />
                          <div className="thumb-overlay">
                            <button className="play-button-glow" aria-label="Resume">
                              <Play className="h-8 w-8 ml-1" />
                            </button>
                          </div>
                          {item.progress.position && item.lesson.duration && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: Math.min(100, (item.progress.position / item.lesson.duration) * 100) + '%' }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-muted-foreground mb-1 truncate">{courseTitle}</p>
                          <h3 className="font-semibold text-sm mb-2 line-clamp-1 text-foreground">{item.lesson.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.lesson.duration
                                ? formatTime(item.progress.position || 0) + ' / ' + formatTime(item.lesson.duration)
                                : formatTime(item.progress.position || 0)}
                            </span>
                            {item.lesson.duration && (
                              <Progress
                                value={Math.min(100, ((item.progress.position || 0) / item.lesson.duration) * 100)}
                                className="h-1.5 flex-1 gradient-progress"
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </ScrollArea>
          </section>
        )}

        {/* Completed Courses */}
        {!ccLoading && completedCourses.length > 0 && (
          <section className="mb-8" aria-labelledby="completed-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="completed-heading" className="text-xl font-semibold flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                Completed Courses
              </h2>
            </div>
            <ScrollArea type="always" className="h-auto">
              <div className="flex flex-wrap gap-3">
                {completedCourses.map((course) => {
                  const courseTitle = getCourseDisplayName(course)
                  return (
                    <Link key={course.id} href={'/course/' + course.slug} className="group">
                      <Card className="glass-card border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10 transition-all">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="font-medium text-sm truncate max-w-[200px]">{courseTitle}</span>
                            <span className="ml-auto text-xs text-green-500 font-medium">100%</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </ScrollArea>
          </section>
        )}

        {/* Your Library */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            Your Library
          </h2>
          <div className="flex items-center gap-2">
            <Select value={String(pagination.limit)} onValueChange={(e: string) => changeLimit(parseInt(e))}>
              <SelectTrigger className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onChanged={refetch} />
            ))}
          </div>
        </ScrollArea>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevPage}
              disabled={!pagination.hasPrev}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 rounded-lg"
                    >
                      {pageNum}
                    </Button>
                  )
                })
                return pages
              })()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextPage}
              disabled={!pagination.hasNext}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="text-center text-sm text-muted-foreground mt-4">
          Page {pagination.page} of {pagination.totalPages} — {pagination.total} courses total
        </div>
      </main>
    </div>
  )
}