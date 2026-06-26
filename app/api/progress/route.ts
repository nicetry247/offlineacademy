import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAnalyticsData } from '@/lib/analytics'
import { z } from 'zod'

const progressSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  moduleId: z.string(),
  position: z.number().min(0),
  completed: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = progressSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { lessonId, courseId, moduleId, position, completed } = parsed.data

    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: 'local-user',
          lessonId,
        },
      },
      update: {
        position,
        completed,
        lastWatched: new Date(),
        courseId,
        moduleId,
      },
      create: {
        userId: 'local-user',
        lessonId,
        courseId,
        moduleId,
        position,
        completed,
        lastWatched: new Date(),
      },
    })

    // Also maintain a course-level summary row so course pages can resume correctly.
    // This is stored separately from lesson progress using null lessonId/moduleId.
    const totalLessons = await prisma.lesson.count({
      where: { module: { courseId } },
    })
    const completedLessons = await prisma.lesson.count({
      where: {
        module: { courseId },
        progress: { some: { userId: 'local-user', completed: true } },
      },
    })

    if (totalLessons > 0) {
      const courseCompleted = completedLessons === totalLessons
      const courseProgressData = {
        userId: 'local-user',
        courseId,
        lessonId: null,
        moduleId: null,
        position,
        completed: courseCompleted,
        lastWatched: new Date(),
      }

      const existingCourseProgress = await prisma.progress.findFirst({
        where: {
          userId: 'local-user',
          courseId,
          lessonId: null,
          moduleId: null,
        },
      })

      if (existingCourseProgress) {
        await prisma.progress.update({
          where: { id: existingCourseProgress.id },
          data: courseProgressData,
        })
      } else {
        await prisma.progress.create({
          data: courseProgressData,
        })
      }
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error('Progress save error:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')
    const type = searchParams.get('type') // 'continue' or 'completed'

    if (type === 'continue') {
      // Get in-progress lessons
      const progressRecords = await prisma.progress.findMany({
        where: {
          userId: 'local-user',
          lessonId: { not: null },
          completed: false,
          lesson: { module: { course: { hidden: false } } },
        },
        orderBy: { lastWatched: 'desc' },
        take: 20,
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      })

      const items = progressRecords
        .filter(p => p.lesson)
        .map(p => ({
          progress: {
            ...p,
            lastWatched: p.lastWatched.toISOString(),
          },
          lesson: p.lesson!,
          course: p.lesson!.module.course,
          module: p.lesson!.module,
        }))

      return NextResponse.json({ items })
    }

    if (type === 'completed') {
      // Get completed courses
      const completedProgress = await prisma.progress.findMany({
        where: {
          userId: 'local-user',
          lessonId: null,
          moduleId: null,
          completed: true,
          course: { hidden: false },
        },
        include: {
          course: true,
        },
      })

      const items = completedProgress.map(p => p.course)

      return NextResponse.json({ items })
    }

    if (type === 'analytics') {
      return NextResponse.json(await getAnalyticsData())
    }

    if (lessonId) {
      const progress = await prisma.progress.findUnique({
        where: {
          userId_lessonId: {
            userId: 'local-user',
            lessonId,
          },
        },
      })
      if (progress) {
        return NextResponse.json({ 
          progress: {
            ...progress,
            lastWatched: progress.lastWatched.toISOString()
          }
        })
      }
      return NextResponse.json({ progress: null })
    }

    if (courseId) {
      const progress = await prisma.progress.findFirst({
        where: {
          userId: 'local-user',
          courseId,
          lessonId: null,
          moduleId: null,
          course: { hidden: false },
        },
      })

      if (progress) {
        return NextResponse.json({
          progress: {
            ...progress,
            lastWatched: progress.lastWatched.toISOString(),
          },
        })
      }

      const latestLessonProgress = await prisma.progress.findFirst({
        where: {
          userId: 'local-user',
          courseId,
          lessonId: { not: null },
          course: { hidden: false },
        },
        orderBy: { lastWatched: 'desc' },
      })

      if (latestLessonProgress) {
        return NextResponse.json({
          progress: {
            ...latestLessonProgress,
            lastWatched: latestLessonProgress.lastWatched.toISOString(),
          },
        })
      }

      return NextResponse.json({ progress: null })
    }

    return NextResponse.json({ error: 'lessonId, courseId or type required' }, { status: 400 })
  } catch (error) {
    console.error('Progress fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}