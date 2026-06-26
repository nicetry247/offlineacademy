import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const COURSE_METADATA_FILENAMES = [
  'offlineacademy.metadata.json',
  'course.metadata.json',
  'metadata.json',
  '.offlineacademy.json',
]

export const MODULE_METADATA_FILENAMES = [
  'offlineacademy.metadata.json',
  'module.metadata.json',
  'metadata.json',
  '.offlineacademy.json',
]

const ALL_METADATA_FILENAMES = new Set([
  ...COURSE_METADATA_FILENAMES,
  ...MODULE_METADATA_FILENAMES,
])

export type CourseMetadataInput = {
  title?: unknown
  displayName?: unknown
  description?: unknown
  thumbnail?: unknown
  tags?: unknown
  categories?: unknown
  favorited?: unknown
  favorite?: unknown
}

export type ApplyCourseMetadataResult = {
  appliedFields: string[]
  skippedFields: string[]
  tagsAdded: string[]
  source: string
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(asTrimmedString)
      .filter((item): item is string => Boolean(item))
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeMetadata(input: CourseMetadataInput) {
  const displayName = asTrimmedString(input.displayName) || asTrimmedString(input.title)
  const description = asTrimmedString(input.description)
  const thumbnail = asTrimmedString(input.thumbnail)
  const tags = normalizeStringList(input.tags)
  const categories = normalizeStringList(input.categories).map(category => (
    category.startsWith('category:') ? category : `category:${category}`
  ))
  const favorited = typeof input.favorited === 'boolean'
    ? input.favorited
    : typeof input.favorite === 'boolean'
      ? input.favorite
      : undefined

  return {
    displayName,
    description,
    thumbnail,
    tags: Array.from(new Set([...tags, ...categories])),
    favorited,
  }
}

export function isMetadataFileName(fileName: string) {
  return ALL_METADATA_FILENAMES.has(fileName.toLowerCase())
}

export async function readCourseMetadataFile(dirPath: string, fileNames = COURSE_METADATA_FILENAMES) {
  for (const fileName of fileNames) {
    const fullPath = join(dirPath, fileName)
    try {
      const fileStat = await stat(fullPath)
      if (!fileStat.isFile()) continue
      const raw = await readFile(fullPath, 'utf8')
      return {
        fileName,
        path: fullPath,
        metadata: JSON.parse(raw) as CourseMetadataInput,
      }
    } catch {
      // Try the next supported filename.
    }
  }

  return null
}

export async function readModuleMetadataFiles(coursePath: string) {
  const results: Array<{ moduleName: string; fileName: string; path: string; metadata: CourseMetadataInput }> = []

  try {
    const entries = await readdir(coursePath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const found = await readCourseMetadataFile(join(coursePath, entry.name), MODULE_METADATA_FILENAMES)
      if (found) {
        results.push({ moduleName: entry.name, ...found })
      }
    }
  } catch {
    return results
  }

  return results
}

export async function applyCourseMetadata(courseId: string, metadata: CourseMetadataInput, source: string): Promise<ApplyCourseMetadataResult> {
  const normalized = normalizeMetadata(metadata)
  const current = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      displayName: true,
      description: true,
      thumbnail: true,
      favorited: true,
      courseTags: { include: { tag: true } },
    },
  })

  if (!current) {
    return { appliedFields: [], skippedFields: ['course:not-found'], tagsAdded: [], source }
  }

  const data: Record<string, unknown> = {}
  const appliedFields: string[] = []
  const skippedFields: string[] = []

  if (normalized.displayName) {
    if (!current.displayName?.trim()) {
      data.displayName = normalized.displayName
      appliedFields.push('displayName')
    } else {
      skippedFields.push('displayName')
    }
  }

  if (normalized.description) {
    if (!current.description?.trim()) {
      data.description = normalized.description
      appliedFields.push('description')
    } else {
      skippedFields.push('description')
    }
  }

  if (normalized.thumbnail) {
    if (!current.thumbnail?.trim()) {
      data.thumbnail = normalized.thumbnail
      appliedFields.push('thumbnail')
    } else {
      skippedFields.push('thumbnail')
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.course.update({ where: { id: courseId }, data })
  }

  const existingTagNames = new Set(current.courseTags.map(courseTag => courseTag.tag.name.toLowerCase()))
  const tagsAdded: string[] = []

  for (const tagName of normalized.tags) {
    if (existingTagNames.has(tagName.toLowerCase())) continue

    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    })

    await prisma.courseTag.upsert({
      where: { courseId_tagId: { courseId, tagId: tag.id } },
      update: {},
      create: { courseId, tagId: tag.id },
    })

    tagsAdded.push(tagName)
  }

  return { appliedFields, skippedFields, tagsAdded, source }
}
