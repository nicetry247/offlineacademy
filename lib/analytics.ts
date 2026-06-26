import { prisma } from '@/lib/prisma'

export interface AnalyticsData {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  notStartedLessons: number
  totalWatchedHours: number
  totalWatchedMinutes: number
  weeklyWatchedHours: number
  weeklyWatchedMinutes: number
  weeklyCompletedLessons: number
  lessonsByType: Array<{ type: string; _count: number }>
  completedByType: Record<string, number>
  completionRate: number
  lessonCompletionRate: number
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const allProgress = await prisma.progress.findMany({
    where: {
      userId: 'local-user',
      course: { hidden: false },
    },
  })

  const completedLessons = allProgress.filter(p => p.lessonId && p.completed)
  const inProgressLessons = allProgress.filter(p => p.lessonId && !p.completed && p.position > 0)
  const notStartedCount = await prisma.lesson.count({
    where: {
      module: { course: { hidden: false } },
      progress: { none: { userId: 'local-user' } },
    },
  })

  const totalCourses = await prisma.course.count({ where: { hidden: false } })
  const completedCourses = await prisma.progress.count({
    where: {
      userId: 'local-user',
      lessonId: null,
      moduleId: null,
      completed: true,
      course: { hidden: false },
    },
  })
  const inProgressCourses = await prisma.progress.count({
    where: {
      userId: 'local-user',
      lessonId: null,
      moduleId: null,
      completed: false,
      course: { hidden: false },
    },
  })

  const totalWatchedSeconds = allProgress.reduce((sum, p) => sum + (p.position || 0), 0)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentProgress = allProgress.filter(p => new Date(p.lastWatched) >= sevenDaysAgo)
  const weeklyWatchedSeconds = recentProgress.reduce((sum, p) => sum + (p.position || 0), 0)
  const weeklyCompleted = recentProgress.filter(p => p.lessonId && p.completed).length

  const lessonsByType = await prisma.lesson.groupBy({
    by: ['type'],
    _count: true,
    where: { module: { course: { hidden: false } } },
  })

  const completedByType: Record<string, number> = {}
  for (const p of completedLessons) {
    if (!p.lessonId) continue
    const lesson = await prisma.lesson.findUnique({ where: { id: p.lessonId }, select: { type: true } })
    if (lesson) {
      completedByType[lesson.type] = (completedByType[lesson.type] || 0) + 1
    }
  }

  const totalLessons = completedLessons.length + inProgressLessons.length + notStartedCount

  return {
    totalCourses,
    completedCourses,
    inProgressCourses,
    totalLessons,
    completedLessons: completedLessons.length,
    inProgressLessons: inProgressLessons.length,
    notStartedLessons: notStartedCount,
    totalWatchedHours: Math.round(totalWatchedSeconds / 3600 * 10) / 10,
    totalWatchedMinutes: Math.round(totalWatchedSeconds / 60),
    weeklyWatchedHours: Math.round(weeklyWatchedSeconds / 3600 * 10) / 10,
    weeklyWatchedMinutes: Math.round(weeklyWatchedSeconds / 60),
    weeklyCompletedLessons: weeklyCompleted,
    lessonsByType,
    completedByType,
    completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0,
    lessonCompletionRate: totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0,
  }
}
