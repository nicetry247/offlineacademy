import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().positive(),
  passed: z.boolean(),
})

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

    const { lessonId, courseId, moduleId, score, totalQuestions, passed } = parsed.data

    const quizAttempt = await prisma.quizAttempt.upsert({
      where: {
        userId_lessonId: {
          userId: 'local-user',
          lessonId,
        },
      },
      update: {
        score,
        passed,
        completed: passed,
      },
      create: {
        userId: 'local-user',
        lessonId,
        score,
        passed,
        completed: passed,
      },
    })

    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: 'local-user',
          lessonId,
        },
      },
      update: {
        courseId,
        moduleId,
        completed: passed,
        position: passed ? totalQuestions : score,
        lastWatched: new Date(),
      },
      create: {
        userId: 'local-user',
        lessonId,
        courseId,
        moduleId,
        completed: passed,
        position: passed ? totalQuestions : score,
        lastWatched: new Date(),
      },
    })

    return NextResponse.json({ success: true, quizAttempt, progress })
  } catch (error) {
    console.error('Quiz attempt error:', error)
    return NextResponse.json({ error: 'Failed to save quiz attempt' }, { status: 500 })
  }
}
