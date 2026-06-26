import { NextRequest, NextResponse } from 'next/server'
import { rm } from 'fs/promises'
import { resolve, sep } from 'path'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const renameSchema = z.object({ displayName: z.string().trim().min(1).max(200) })
const tagSchema = z.object({ tagId: z.string().min(1) })
const favoriteSchema = z.object({ favorited: z.boolean() })

async function getCoursesRootPath() {
  const setting = await prisma.setting.findUnique({ where: { key: 'coursesRoot' } })
  return setting?.value || './My_Courses'
}

async function findCourse(slug: string, includeHidden = false) {
  return prisma.course.findFirst({
    where: includeHidden ? { slug } : { slug, hidden: false },
    select: { id: true, slug: true, name: true, displayName: true, hidden: true, path: true },
  })
}

function isPathWithinRoot(candidatePath: string, rootPath: string) {
  const normalizedCandidate = resolve(candidatePath)
  const normalizedRoot = resolve(rootPath)
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(normalizedRoot + sep)
}

async function enrichCourseTags(course: { id: string }) {
  const connections = await prisma.courseTag.findMany({
    where: { courseId: course.id },
    include: { tag: true },
  })
  return connections.map(cn => cn.tag)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await request.json().catch(() => ({}))
    const rename = renameSchema.safeParse(body)
    const tag = body?.tagId ? tagSchema.safeParse(body) : null
    const favorite = body?.favorited !== undefined ? favoriteSchema.safeParse(body) : null

    if (!rename.success && !tag?.success && !favorite?.success) {
      return NextResponse.json({ error: 'Invalid request', details: rename.error?.flatten() ?? {} }, { status: 400 })
    }

    const existing = await findCourse(slug)
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (rename.success) {
      data.displayName = rename.data.displayName
    }

    if (favorite?.success) {
      data.favorited = favorite.data.favorited
    }

    const tagRecord = tag?.success
      ? await prisma.tag.upsert({
          where: { name: tag.data.tagId },
          update: {},
          create: { name: tag.data.tagId },
        })
      : null

    const course = await prisma.course.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        hidden: true,
        path: true,
      },
    })

    if (tagRecord) {
      await prisma.courseTag.upsert({
        where: {
          courseId_tagId: {
            courseId: existing.id,
            tagId: tagRecord.id,
          },
        },
        update: {},
        create: {
          courseId: existing.id,
          tagId: tagRecord.id,
        },
      })
    }

    const tags = await enrichCourseTags(course)

    return NextResponse.json({ success: true, course: { ...course, tags } })
  } catch (error) {
    console.error('Course update error:', error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const scope = (request.nextUrl.searchParams.get('scope') || 'library').toLowerCase()

    if (scope !== 'library' && scope !== 'disk' && scope !== 'tag') {
      return NextResponse.json({ error: 'Invalid delete scope. Use library, disk, or tag.' }, { status: 400 })
    }

    const existing = await findCourse(slug, scope === 'disk')
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (scope === 'disk') {
      const coursesRoot = await getCoursesRootPath()
      const absoluteCoursePath = resolve(existing.path)
      const absoluteCoursesRoot = resolve(coursesRoot)

      if (!isPathWithinRoot(absoluteCoursePath, absoluteCoursesRoot)) {
        return NextResponse.json(
          {
            error: 'Course path is outside the configured courses root',
            details: { coursePath: absoluteCoursePath, coursesRoot: absoluteCoursesRoot },
          },
          { status: 400 }
        )
      }

      await rm(absoluteCoursePath, { recursive: true, force: true })
      await prisma.course.delete({ where: { id: existing.id } })

      return NextResponse.json({ success: true, deletedFromDisk: true, path: absoluteCoursePath })
    }

    if (scope === 'tag') {
      const { tagId } = await request.json().catch(() => ({ tagId: '' }))

      if (!tagId) {
        return NextResponse.json({ error: 'tagId is required when removing a tag' }, { status: 400 })
      }

      await prisma.courseTag.deleteMany({
        where: { courseId: existing.id, tagId },
      })

      const course = await prisma.course.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          slug: true,
          name: true,
          displayName: true,
          hidden: true,
          path: true,
        },
      })

      const tags = course ? await enrichCourseTags(course) : []
      return NextResponse.json({ success: true, course: course ? { ...course, tags } : null })
    }

    await prisma.course.update({
      where: { id: existing.id },
      data: {
        hidden: true,
        displayName: null,
      },
    })

    return NextResponse.json({ success: true, deletedFromLibrary: true })
  } catch (error) {
    console.error('Course delete error:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
