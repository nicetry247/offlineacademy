import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureModuleQuizCache, syncQuizLessonFromCache, writeQuizCache } from '@/lib/quiz'
import { join, dirname } from 'path'
const QUIZ_CACHE_FILE = 'quiz_cache.json'

async function getCourseWithModules(slug: string) {
  return prisma.course.findFirst({
    where: { slug, hidden: false },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: true },
      },
    },
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await request.json().catch(() => ({}))
    const action = body?.action
    if (action === 'regenerate') {
      const course = await getCourseWithModules(slug)
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      const sourceValue = body?.source
      const difficulty = typeof body?.difficulty === 'string' ? body.difficulty.toLowerCase() : 'medium'
      const results: Array<{ module: string; status: 'ok' | 'skipped'; error?: string }> = []

      for (const module of course.modules) {
        const modulePath = join(course.path, module.name)
        try {
          const generated = await ensureModuleQuizCache({
            modulePath,
            topic: module.name,
            source: sourceValue === 'the-trivia-api' ? 'the-trivia-api' : 'quizapi',
            force: true,
          })

          if (!generated) {
            results.push({ module: module.name, status: 'skipped', error: 'Intro/local-only quiz generation skipped' })
            continue
          }

          await syncQuizLessonFromCache({
            moduleId: module.id,
            modulePath,
            courseRoot: dirname(course.path),
            topic: module.name,
            source: sourceValue === 'the-trivia-api' ? 'the-trivia-api' : 'quizapi',
            lessonOrder: module.lessons.length,
            autoFetch: false,
            force: true,
          })

          results.push({ module: module.name, status: 'ok' })
        } catch (error) {
          results.push({ module: module.name, status: 'skipped', error: String(error) })
        }
      }

      return NextResponse.json({ success: true, action: 'regenerate', difficulty, results })
    }

    if (action === 'import') {
      const course = await getCourseWithModules(slug)
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      const moduleName = typeof body?.module === 'string' ? body.module.trim() : ''
      const targetModule = course.modules.find((item) => item.name === moduleName)
      if (!targetModule) {
        return NextResponse.json({ error: 'Module not found', availableModules: course.modules.map((item) => item.name) }, { status: 404 })
      }

      const quiz = typeof body?.quiz === 'object' && body.quiz !== null ? (body.quiz as Record<string, unknown>) : null
      if (!quiz) {
        return NextResponse.json({ error: 'Missing quiz JSON' }, { status: 400 })
      }

      const modulePath = join(course.path, targetModule.name)
      const cachePath = join(modulePath, QUIZ_CACHE_FILE)
      await writeQuizCache(cachePath, quiz as never)

      const synced = await syncQuizLessonFromCache({
        moduleId: targetModule.id,
        modulePath,
        courseRoot: dirname(course.path),
        topic: targetModule.name,
        source: 'the-trivia-api',
        lessonOrder: targetModule.lessons.length,
        autoFetch: false,
        force: true,
      })

      return NextResponse.json({
        success: true,
        action: 'import',
        module: targetModule.name,
        cachePath,
        lesson: synced?.lesson || null,
      })
    }

    if (action === 'clear') {
      const course = await getCourseWithModules(slug)
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      const moduleName = typeof body?.module === 'string' ? body.module.trim() : ''

      if (moduleName === '__all__') {
        const moduleIds = course.modules.map((module) => module.id)
        const modulePaths = course.modules.map((module) => join(course.path, module.name, QUIZ_CACHE_FILE))

        try {
          await prisma.lesson.deleteMany({ where: { moduleId: { in: moduleIds }, slug: 'quiz' } })
        } catch {
          // ignore if no quiz lessons exist
        }

        try {
          const { unlink } = await import('fs/promises')
          await Promise.allSettled(modulePaths.map((cachePath) => unlink(cachePath).catch(() => {})))
        } catch {
          // ignore missing cache files
        }

        return NextResponse.json({ success: true, action: 'clear', module: '__all__' })
      }

      if (!moduleName) {
        return NextResponse.json({ error: 'Missing module name' }, { status: 400 })
      }

      const targetModule = course.modules.find((item) => item.name === moduleName)
      if (!targetModule) {
        return NextResponse.json({ error: 'Module not found', availableModules: course.modules.map((item) => item.name) }, { status: 404 })
      }

      const modulePath = join(course.path, targetModule.name)
      const cachePath = join(modulePath, QUIZ_CACHE_FILE)

      try {
        await prisma.lesson.deleteMany({ where: { moduleId: targetModule.id, slug: 'quiz' } })
      } catch {
        // ignore if no quiz lesson exists
      }

      try {
        const { unlink } = await import('fs/promises')
        await unlink(cachePath).catch(() => {})
      } catch {
        // ignore missing cache file
      }

      return NextResponse.json({ success: true, action: 'clear', module: targetModule.name })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Course quiz batch error:', error)
    return NextResponse.json({ error: 'Failed to process course quiz action' }, { status: 500 })
  }
}
