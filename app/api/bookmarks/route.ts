import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bookmarkSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  position: z.number().int().min(0),
  note: z.string().trim().max(1000).optional().nullable(),
})

function normalizeNote(note?: string | null) {
  const trimmed = (note || '').trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    const courseId = searchParams.get('courseId')

    if (!lessonId && !courseId) {
      return NextResponse.json({ error: 'lessonId or courseId required' }, { status: 400 })
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: 'local-user',
        ...(lessonId ? { lessonId } : { courseId: courseId! }),
        lesson: {
          module: {
            course: { hidden: false },
          },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        lesson: {
          select: { id: true, title: true, slug: true },
        },
      },
    })

    return NextResponse.json({
      items: bookmarks.map(bookmark => ({
        ...bookmark,
        note: bookmark.note ?? '',
        createdAt: bookmark.createdAt.toISOString(),
        updatedAt: bookmark.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Bookmark fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bookmarkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: 'local-user',
        lessonId: parsed.data.lessonId,
        courseId: parsed.data.courseId,
        moduleId: parsed.data.moduleId,
        position: parsed.data.position,
        note: normalizeNote(parsed.data.note),
      },
      include: {
        lesson: {
          select: { id: true, title: true, slug: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      bookmark: {
        ...bookmark,
        note: bookmark.note ?? '',
        createdAt: bookmark.createdAt.toISOString(),
        updatedAt: bookmark.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Bookmark create error:', error)
    return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 })
  }
}
