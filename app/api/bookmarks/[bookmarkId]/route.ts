import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
})

function normalizeNote(note?: string | null) {
  const trimmed = (note || '').trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ bookmarkId: string }> }) {
  try {
    const { bookmarkId } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const bookmark = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { note: normalizeNote(parsed.data.note) },
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
    console.error('Bookmark update error:', error)
    return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ bookmarkId: string }> }) {
  try {
    const { bookmarkId } = await params

    await prisma.bookmark.delete({ where: { id: bookmarkId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bookmark delete error:', error)
    return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 })
  }
}
