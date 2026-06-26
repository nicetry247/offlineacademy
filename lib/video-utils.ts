import { execSync } from 'child_process'
import { join, dirname, basename, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'

/**
 * Get video duration in seconds using ffprobe
 */
export function getVideoDuration(filePath: string): number | null {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8', timeout: 30000 }
    )
    const duration = parseFloat(output.trim())
    return isNaN(duration) ? null : Math.round(duration)
  } catch (error) {
    console.warn(`Failed to get duration for ${filePath}:`, error)
    return null
  }
}

/**
 * Generate thumbnail from video at specified time (default 10% or 5 seconds)
 */
export function generateVideoThumbnail(
  videoPath: string,
  thumbnailDir: string,
  timePercent: number = 0.1
): string | null {
  try {
    // Get video duration first to calculate timestamp
    const duration = getVideoDuration(videoPath)
    if (!duration) return null

    const timestamp = Math.min(duration * timePercent, 5) // Max 5 seconds or 10%
    const timeStr = formatTimeForFfmpeg(timestamp)

    // Create thumbnail directory if it doesn't exist
    if (!existsSync(thumbnailDir)) {
      mkdirSync(thumbnailDir, { recursive: true })
    }

    const videoName = basename(videoPath, extname(videoPath))
    const thumbnailName = `${videoName}-thumb.jpg`
    const thumbnailPath = join(thumbnailDir, thumbnailName)

    // Generate thumbnail using ffmpeg
    execSync(
      `ffmpeg -y -ss ${timeStr} -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=320:-1" "${thumbnailPath}"`,
      { stdio: 'ignore', timeout: 60000 }
    )

    if (existsSync(thumbnailPath)) {
      return thumbnailName
    }
    return null
  } catch (error) {
    console.warn(`Failed to generate thumbnail for ${videoPath}:`, error)
    return null
  }
}

/**
 * Format seconds as HH:MM:SS for ffmpeg -ss parameter
 */
function formatTimeForFfmpeg(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

/**
 * Check if ffmpeg/ffprobe are available
 */
export function checkVideoTools(): boolean {
  try {
    execSync('ffprobe -version', { stdio: 'ignore' })
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}