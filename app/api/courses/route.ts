import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalThumbnailUrl } from '@/lib/thumbnail-index-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = (page - 1) * limit
    
    // Search
    const search = searchParams.get('search') || ''
    
    // Filters
    const filter = searchParams.get('filter') || 'all' // all, in-progress, completed, not-started, favorites, tag:<tagId>
    const tag = searchParams.get('tag') || ''
    const tagFilter = tag || (filter.startsWith('tag:') ? filter.slice(4) : '')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build where clause
    const where: any = { hidden: false }

    if (search) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term } },
        { displayName: { contains: term } },
        { slug: { contains: term } },
      ]
    }

    if (favoritesOnly || filter === 'favorites') {
      where.favorited = true
    }

    if (tagFilter) {
      where.courseTags = { some: { tagId: tagFilter } }
    }

    if (filter === 'in-progress') {
      where.progress = {
        some: { userId: 'local-user', completed: false, lessonId: null },
      }
    } else if (filter === 'completed') {
      where.progress = {
        some: { userId: 'local-user', completed: true, lessonId: null },
      }
    } else if (filter === 'not-started') {
      where.NOT = {
        progress: { some: { userId: 'local-user', lessonId: null } },
      }
    }

    // Build orderBy. Favorites are pinned above non-favorites for library organization.
    const secondaryOrderBy: any = {}
    if (sortBy === 'name') {
      secondaryOrderBy.name = sortOrder
    } else if (sortBy === 'progress') {
      secondaryOrderBy.updatedAt = sortOrder
    } else {
      secondaryOrderBy[sortBy] = sortOrder
    }
    const orderBy: any[] = [{ favorited: 'desc' }, secondaryOrderBy]

    const total = await prisma.course.count({ where })

    const courses = await prisma.course.findMany({
      where,
      orderBy,
      skip: Math.max(0, skip),
      take: limit,
      include: {
        _count: { select: { modules: true } },
        progress: {
          where: { userId: 'local-user', lessonId: null },
        },
        courseTags: {
          include: { tag: true },
          orderBy: { tag: { name: 'asc' } },
        },
      },
    })

    const courseIds = courses.map(c => c.id)
    const lessonCounts = await prisma.lesson.groupBy({
      by: ['moduleId'],
      where: { module: { courseId: { in: courseIds } } },
      _count: true,
    })

    const moduleToCourse = new Map<string, string>()
    const modules = await prisma.module.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true },
    })
    modules.forEach(m => moduleToCourse.set(m.id, m.courseId))

    const moduleLessonCounts = new Map<string, number>()
    lessonCounts.forEach(lc => {
      const courseId = moduleToCourse.get(lc.moduleId as string)
      if (courseId) {
        moduleLessonCounts.set(courseId, (moduleLessonCounts.get(courseId) || 0) + lc._count)
      }
    })

    const coursesWithProgress = await Promise.all(courses.map(async (course) => {
      const courseProgress = course.progress[0]
      const totalLessons = moduleLessonCounts.get(course.id) || 0
      let completedLessons = 0
      let percentage = 0
      let lastWatched = null

      if (courseProgress) {
        completedLessons = courseProgress.completed ? totalLessons : 0
        percentage = courseProgress.completed ? 100 : 0
        lastWatched = courseProgress.lastWatched.toISOString()
      }

      return {
        ...course,
        _count: { ...course._count, lessons: totalLessons },
        progress: { completedLessons, totalLessons, percentage, lastWatched },
        thumbnail: await getLocalThumbnailUrl(course.slug) ?? null,
        description: course.description,
        tags: course.courseTags.map((connection) => connection.tag),
      }
    }))

    if (sortBy === 'progress') {
      coursesWithProgress.sort((a, b) =>
        sortOrder === 'asc'
          ? a.progress.percentage - b.progress.percentage
          : b.progress.percentage - a.progress.percentage
      )
    }

    const totalPages = Math.ceil(total / limit)
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { courseTags: true } } },
    })

    return NextResponse.json({
      courses: coursesWithProgress,
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses', details: String(error) },
      { status: 500 }
    )
  }
}