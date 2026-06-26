/**
 * Course Thumbnail Index - Server Only
 * Handles local filesystem thumbnail checks
 * Only import this in server components
 */
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Get local thumbnail URL if it exists on filesystem
 * Server-side only - checks filesystem
 */
export async function getLocalThumbnailUrl(courseSlug: string): Promise<string | null> {
  // Check for .png first, then .svg
  for (const ext of ['.png', '.svg']) {
    const localPath = join(process.cwd(), 'public', 'thumbnails', 'courses', `${courseSlug}-thumb${ext}`)
    if (existsSync(localPath)) {
      return `/thumbnails/courses/${courseSlug}-thumb${ext}`
    }
  }
  return null
}