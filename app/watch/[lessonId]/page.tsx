import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { WatchPageClient } from './WatchPageClient'
import { ensureModuleQuizCache } from '@/lib/quiz'
import { join } from 'path'

interface WatchPageProps {
  params: Promise<{ lessonId: string }>
  searchParams: Promise<{ course?: string }>
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { lessonId } = await params
  const { course: courseSlug } = await searchParams

  try {
    // Find the lesson with its module
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { 
        module: true,
        progress: {
          where: { userId: 'local-user' },
        },
      },
    })

    if (!lesson) {
      notFound()
    }

    // Fetch the course
    const course = await prisma.course.findUnique({
      where: { id: lesson.module.courseId },
    })

    if (!course) {
      notFound()
    }

    const quizSourceSetting = await prisma.setting.findUnique({ where: { key: 'quizApiSource' } })
    const quizSource = quizSourceSetting?.value === 'the-trivia-api'
      ? 'the-trivia-api'
      : 'quizapi'
    const quizCacheResult = lesson.type === 'QUIZ'
      ? await ensureModuleQuizCache({
          modulePath: join(course.path, lesson.module.name),
          topic: lesson.module.name,
          source: quizSource,
        })
      : null

    // Fetch modules with lessons and progress
    const modules = await prisma.module.findMany({
      where: { courseId: course.id },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            progress: {
              where: { userId: 'local-user' },
            },
          },
        },
      },
    })

    // Fetch course-level progress
    const courseProgress = await prisma.progress.findFirst({
      where: { userId: 'local-user', courseId: course.id, lessonId: null, moduleId: null },
    })

    // Calculate all lessons
    const allLessons = modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === lessonId)
    const prevLesson = currentIndex > 0 
      ? { id: allLessons[currentIndex - 1].id, courseSlug: course.slug }
      : null
    const nextLesson = currentIndex < allLessons.length - 1
      ? { id: allLessons[currentIndex + 1].id, courseSlug: course.slug }
      : null

    const totalLessons = allLessons.length
    const completedLessons = allLessons.filter(l => l.progress[0]?.completed).length
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Build response data
    const data = {
      lesson: {
        ...lesson,
        progress: lesson.progress[0] ? {
          completed: lesson.progress[0].completed,
          position: lesson.progress[0].position,
          lastWatched: lesson.progress[0].lastWatched.toISOString(),
        } : null,
        quiz: quizCacheResult?.quiz || null,
      },
      course: {
        ...course,
        progress: courseProgress ? {
          ...courseProgress,
          lastWatched: courseProgress.lastWatched.toISOString(),
        } : null,
        modules: modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => ({
            ...l,
            progress: l.progress[0] ? {
              completed: l.progress[0].completed,
              position: l.progress[0].position,
              lastWatched: l.progress[0].lastWatched.toISOString(),
            } : null,
          })),
        })),
        stats: {
          totalLessons,
          completedLessons,
          percentage,
        },
      },
      prevLesson,
      nextLesson,
      currentIndex,
      totalLessons: allLessons.length,
    }

    return <WatchPageClient initialData={data} />
  } catch (error) {
    console.error('WatchPage error:', error)
    notFound()
  }
}