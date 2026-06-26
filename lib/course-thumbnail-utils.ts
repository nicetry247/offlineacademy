import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const LOCAL_THUMBNAIL_NAMES = ['cover', 'thumbnail']
const LOCAL_THUMBNAIL_EXTS = ['.jpg', '.jpeg', '.png', '.webp']

const COVER_GRADIENTS = [
  'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500',
  'bg-gradient-to-br from-emerald-500 via-green-500 to-lime-500',
  'bg-gradient-to-br from-orange-500 via-red-500 to-rose-500',
  'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
  'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500',
  'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
  'bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500',
]

export function getDeterministicGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[index]
}

export async function getLocalCourseThumbnailPath(coursePath: string): Promise<string | null> {
  try {
    const entries = await readdir(coursePath, { withFileTypes: true })
    const files = entries.filter(e => e.isFile())

    for (const baseName of LOCAL_THUMBNAIL_NAMES) {
      for (const ext of LOCAL_THUMBNAIL_EXTS) {
        const match = files.find(f => f.name.toLowerCase() === `${baseName}${ext}`)
        if (match) {
          return join(coursePath, match.name)
        }
      }
    }
  } catch {
    // coursePath may not exist yet or be unreadable
  }
  return null
}

export async function ensurePublicThumbnail(
  courseSlug: string,
  sourcePath: string,
): Promise<string | null> {
  const ext = extname(sourcePath).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null

  const thumbDir = join(process.cwd(), 'public', 'thumbnails', 'courses')
  if (!existsSync(thumbDir)) {
    await mkdir(thumbDir, { recursive: true })
  }

  const targetName = `${courseSlug}-thumb${ext}`
  const targetPath = join(thumbDir, targetName)

  try {
    const sourceStat = await stat(sourcePath)
    const targetStat = await stat(targetPath).catch(() => null)
    if (!targetStat || sourceStat.mtimeMs !== targetStat.mtimeMs || sourceStat.size !== targetStat.size) {
      const { copyFile } = await import('fs/promises')
      await copyFile(sourcePath, targetPath)
      const targetStat2 = await stat(targetPath)
      await stat(targetPath) // ensure exists
      try {
        // touch target mtime to match source so next run can diff by mtime
        const { utimes } = await import('fs/promises')
        await utimes(targetPath, new Date(sourceStat.mtimeMs), new Date(sourceStat.mtimeMs))
      } catch {
        // ignore utimes failure; content copy is what matters
      }
    }
    return `/thumbnails/courses/${targetName}`
  } catch {
    return null
  }
}

export function getThumbnailPriority(coursePath: string): 'local' | 'downloaded' | 'gradient' {
  return 'local'
}
