import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { scanCoursesDirectory } from '@/lib/scanner'

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const root = '/tmp/offlineacademy-subtitle-scan-smoke'
  const coursesRoot = join(root, 'My_Courses')
  const modulePath = join(coursesRoot, 'Subtitle Smoke Course', '01 - Module')

  await rm(root, { recursive: true, force: true })
  await mkdir(modulePath, { recursive: true })

  await writeFile(join(modulePath, '01 - Lesson.mp4'), '')
  await writeFile(join(modulePath, '01 - Lesson.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nLegacy English\n')
  await writeFile(join(modulePath, '01 - Lesson.en.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nEnglish\n')
  await writeFile(join(modulePath, '01 - Lesson.es.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nEspañol\n')
  await writeFile(join(modulePath, '01 - Lesson.ja.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n日本語\n')
  await writeFile(join(modulePath, '01 - Lesson.pt-BR.srt'), '1\n00:00:00,000 --> 00:00:01,000\nPortuguês\n')

  await prisma.setting.upsert({
    where: { key: 'coursesRoot' },
    update: { value: coursesRoot },
    create: { key: 'coursesRoot', value: coursesRoot },
  })

  const result = await scanCoursesDirectory({ maxConcurrency: 1, maxLessonsPerCourse: 10, maxModulesPerCourse: 5 })
  assert(result.errors.length === 0, `expected no scan errors, got ${JSON.stringify(result.errors)}`)

  const lesson = await prisma.lesson.findFirst({
    where: { fileName: '01 - Lesson.mp4' },
    include: { subtitles: { orderBy: [{ isDefault: 'desc' }, { label: 'asc' }] } },
  })

  assert(lesson, 'expected scanned lesson to exist')
  assert(lesson?.subtitlePath, 'expected legacy subtitlePath fallback to be set')
  assert(lesson?.subtitles.length === 5, `expected 5 subtitle tracks, got ${lesson?.subtitles.length}`)
  assert(lesson?.subtitles.some(track => track.lang === 'es' && track.label === 'Spanish'), 'expected Spanish subtitle track')
  assert(lesson?.subtitles.some(track => track.lang === 'ja' && track.label === 'Japanese'), 'expected Japanese subtitle track')
  assert(lesson?.subtitles.some(track => track.lang === 'pt-BR' && track.label === 'Portuguese (Brazil)' && track.format === 'srt'), 'expected pt-BR SRT subtitle track')
  assert(lesson?.subtitles.filter(track => track.isDefault).length === 1, 'expected exactly one default subtitle track')

  console.log('subtitle scan verification passed')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
