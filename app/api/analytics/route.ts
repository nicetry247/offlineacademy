import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = 'local-user'

    // 1. Total completed lessons and total watch time (from completed lessons)
    const completedLessons = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { not: null },
        completed: true,
      },
      include: {
        lesson: true,
      },
    })

    // 2. In-progress lessons (position watch time)
    const inProgressLessons = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { not: null },
        completed: false,
        position: { gt: 0 },
      },
      include: {
        lesson: true,
      },
    })

    // 3. All lessons for completion stats
    const allLessons = await prisma.lesson.count({
      where: {
        module: { course: { hidden: false } },
      },
    })

    // 4. Completed courses
    const completedCourses = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: null,
        moduleId: null,
        completed: true,
        course: { hidden: false },
      },
      include: { course: true },
    })

    // 5. In-progress courses (have lesson progress but course not completed)
    const inProgressCourses = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { not: null },
        lesson: { module: { course: { hidden: false } } },
      },
      include: {
        lesson: {
          include: {
            module: { include: { course: true } },
          },
        },
      },
      orderBy: { lastWatched: 'desc' },
    })

    // 6. Bookmarks count
    const totalBookmarks = await prisma.bookmark.count({
      where: { userId },
    })

    // 7. Weekly progress - lessons completed in the last 8 weeks
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const weeklyCompleted = await prisma.progress.groupBy({
      by: ['lastWatched'],
      where: {
        userId,
        lessonId: { not: null },
        completed: true,
        lastWatched: { gte: eightWeeksAgo },
      },
      _count: { id: true },
    })

    // Aggregate by week
    const weeklyData = new Map<string, number>()
    for (const wc of weeklyCompleted) {
      const weekStart = new Date(wc.lastWatched)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]
      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + wc._count.id)
    }

    // Ensure last 8 weeks have entries (even if 0)
    const weeklyProgress: Array<{ week: string; count: number }> = []
    for (let i = 7; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - date.getDay() - i * 7)
      const weekKey = date.toISOString().split('T')[0]
      weeklyProgress.push({
        week: weekKey,
        count: weeklyData.get(weekKey) || 0,
      })
    }

    // Calculate totals
    const completedLessonCount = completedLessons.length
    const totalWatchTimeSeconds = completedLessons.reduce((sum, p) => {
      return sum + (p.lesson?.duration || 0)
    }, 0) + inProgressLessons.reduce((sum, p) => {
      return sum + (p.position || 0)
    }, 0)

    // Unique courses with progress
    const courseIds = new Set<string>()
    for (const p of inProgressCourses) {
      if (p.lesson?.module?.courseId) {
        courseIds.add(p.lesson.module.courseId)
      }
    }
    for (const c of completedCourses) {
      if (c.courseId) courseIds.add(c.courseId)
    }

    // In-progress courses with their progress
    const inProgressCourseMap = new Map<string, { 
      courseId: string
      courseName: string
      courseSlug: string
      completedLessons: number
      totalLessons: number
      percentage: number
      lastWatched: Date
    }>()

    for (const p of inProgressCourses) {
      const course = p.lesson?.module?.course
      if (!course) continue
      const existing = inProgressCourseMap.get(course.id)
      if (!existing || p.lastWatched > existing.lastWatched) {
        inProgressCourseMap.set(course.id, {
          courseId: course.id,
          courseName: course.displayName || course.name,
          courseSlug: course.slug,
          completedLessons: 0, // will compute below
          totalLessons: 0,
          percentage: 0,
          lastWatched: p.lastWatched,
        })
      }
    }

    // Compute progress for each in-progress course
    for (const [courseId, data] of Array.from(inProgressCourseMap.entries())) {
      const lessons = await prisma.lesson.findMany({
        where: { module: { courseId } },
        select: { id: true },
      })
      const completed = await prisma.progress.count({
        where: {
          userId,
          lessonId: { in: lessons.map(l => l.id) },
          completed: true,
        },
      })
      data.totalLessons = lessons.length
      data.completedLessons = completed
      data.percentage = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0
    }

    return NextResponse.json({
      summary: {
        totalWatchTimeHours: Math.round(totalWatchTimeSeconds / 3600 * 10) / 10,
        totalWatchTimeMinutes: Math.round(totalWatchTimeSeconds / 60),
        completedLessons: completedLessonCount,
        totalLessons: allLessons,
        overallCompletionRate: allLessons > 0 ? Math.round((completedLessonCount / allLessons) * 100) : 0,
        completedCourses: completedCourses.length,
        inProgressCourses: inProgressCourseMap.size,
        totalBookmarks,
      },
      weeklyProgress,
      inProgressCourses: Array.from(inProgressCourseMap.values()),
      completedCourses: completedCourses.map(c => ({
        courseId: c.courseId,
        courseName: c.course.displayName || c.course.name,
        courseSlug: c.course.slug,
        completedAt: c.lastWatched,
      })),
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
