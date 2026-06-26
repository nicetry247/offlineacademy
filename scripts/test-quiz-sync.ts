import { prisma } from '@/lib/prisma'
import { syncQuizLessonFromCache } from '@/lib/quiz'
import { join, dirname, basename } from 'path'

async function main() {
  const module = await prisma.module.findFirst({
    where: { slug: 'module-1' },
    include: {
      course: true,
      lessons: { select: { id: true, title: true, type: true, slug: true } },
    },
  })

  if (!module) {
    console.log('No module-1 found')
    return
  }

  const modulePath = join(module.course.path, module.name)
  console.log('Module:', module.id, module.name)
  console.log('Course:', module.course.name, module.course.path)
  console.log('ModulePath:', modulePath)

  const cachePath = join(modulePath, 'quiz_cache.json')
  console.log('ExpectedCache:', cachePath)

  const sync = await syncQuizLessonFromCache({
    moduleId: module.id,
    modulePath,
    courseRoot: dirname(module.course.path),
    topic: basename(modulePath),
    source: 'the-trivia-api',
    autoFetch: false,
  })

  console.log('SyncResult:', JSON.stringify(sync, null, 2))

  const lessons = await prisma.lesson.findMany({
    where: { moduleId: module.id },
    select: { id: true, title: true, type: true, slug: true },
  })

  console.log('Lessons:', JSON.stringify(lessons, null, 2))
}

main().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})
