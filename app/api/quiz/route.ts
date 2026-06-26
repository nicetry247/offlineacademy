import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureModuleQuizCache, syncQuizLessonFromCache, shouldSkipQuizGeneration } from '@/lib/quiz'
import type { QuizSource } from '@/lib/quiz-types'
import { z } from 'zod'
import { join, dirname } from 'path'

const requestSchema = z.object({
  lessonId: z.string().min(1),
  topic: z.string().min(1).optional(),
  source: z.enum(['quizapi', 'the-trivia-api']).optional(),
  force: z.boolean().optional(),
})

async function getQuizSource(): Promise<QuizSource> {
  const setting = await prisma.setting.findUnique({ where: { key: 'quizApiSource' } })
  return setting?.value === 'the-trivia-api' ? 'the-trivia-api' : 'quizapi'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: {
        module: {
          include: {
            course: true,
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (!lesson.module.course.path) {
      return NextResponse.json({ error: 'Course path missing' }, { status: 400 })
    }

    const source = parsed.data.source || await getQuizSource()
    const topic = parsed.data.topic?.trim() || lesson.module.name
    const modulePath = join(lesson.module.course.path, lesson.module.name)
    const moduleShouldSkip = await shouldSkipQuizGeneration(modulePath, topic)
    if (moduleShouldSkip) {
      return NextResponse.json({ error: 'Quiz generation skipped for this module' }, { status: 400 })
    }

    const cache = await ensureModuleQuizCache({
      modulePath,
      topic,
      source,
      force: parsed.data.force ?? Boolean(parsed.data.topic),
    })

    if (!cache) {
      return NextResponse.json({ error: 'Failed to generate quiz cache' }, { status: 500 })
    }

    const synced = await syncQuizLessonFromCache({
      moduleId: lesson.moduleId,
      modulePath,
      courseRoot: dirname(lesson.module.course.path),
      topic,
      source,
      autoFetch: false,
      force: false,
    })

    return NextResponse.json({ ...cache, lesson: synced?.lesson || null })
  } catch (error) {
    console.error('Quiz API error:', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}
