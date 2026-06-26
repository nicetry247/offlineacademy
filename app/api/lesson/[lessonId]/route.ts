import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const { searchParams } = new URL(request.url)
    const courseSlug = searchParams.get('course')

    // Find the lesson with its module and progress
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
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Fetch the course
    const course = await prisma.course.findFirst({
      where: { id: lesson.module.courseId, hidden: false },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

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

    // Fetch course-level progress, with a fallback to the latest watched lesson.
    const courseProgress = await prisma.progress.findFirst({
      where: { userId: 'local-user', courseId: course.id, lessonId: null, moduleId: null },
    })
    const latestLessonProgress = courseProgress
      ? null
      : await prisma.progress.findFirst({
          where: {
            userId: 'local-user',
            courseId: course.id,
            lessonId: { not: null },
          },
          orderBy: { lastWatched: 'desc' },
        })

    // Calculate all lessons
    const allLessons = modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === lessonId)
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

    const totalLessons = allLessons.length
    const completedLessons = allLessons.filter(l => l.progress[0]?.completed).length
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Build response data
    const data = {
      lesson: {
        ...lesson,
        progress: lesson.progress[0] ? {
          ...lesson.progress[0],
          lastWatched: lesson.progress[0].lastWatched.toISOString()
        } : null,
      },
      course: {
        ...course,
        progress: courseProgress
          ? {
              ...courseProgress,
              lastWatched: courseProgress.lastWatched.toISOString(),
            }
          : latestLessonProgress
            ? {
                ...latestLessonProgress,
                lastWatched: latestLessonProgress.lastWatched.toISOString(),
              }
            : null,
        modules: modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => ({
            ...l,
            progress: l.progress[0] ? {
              ...l.progress[0],
              lastWatched: l.progress[0].lastWatched.toISOString()
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

    return NextResponse.json(data)
  } catch (error) {
    console.error('Lesson fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 })
  }
}