import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { scanCoursesDirectory } from '@/lib/scanner'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

async function main() {
  const root = '/tmp/offlineacademy-stale-scan'
  const coursesRoot = join(root, 'My_Courses')
  const coursePath = join(coursesRoot, 'Stale Course', '01 - Module')

  await rm(root, { recursive: true, force: true })
  await mkdir(coursePath, { recursive: true })
  await writeFile(join(coursePath, '01 - Lesson.mp4'), '')

  await prisma.setting.upsert({
    where: { key: 'coursesRoot' },
    update: { value: coursesRoot },
    create: { key: 'coursesRoot', value: coursesRoot },
  })

  await scanCoursesDirectory({ maxConcurrency: 1, maxLessonsPerCourse: 10, maxModulesPerCourse: 5 })

  const before = await prisma.course.count()
  assert(before === 1, `expected 1 course before delete, got ${before}`)

  await rm(join(coursesRoot, 'Stale Course'), { recursive: true, force: true })

  await scanCoursesDirectory({ maxConcurrency: 1, maxLessonsPerCourse: 10, maxModulesPerCourse: 5 })

  const after = await prisma.course.count()
  assert(after === 0, `expected 0 courses after delete, got ${after}`)

  console.log('stale course deletion verification passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
