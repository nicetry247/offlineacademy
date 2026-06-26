import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return hours + 'h ' + minutes + 'm'
  }
  return minutes + 'm ' + secs + 's'
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
  }
  return minutes + ':' + String(secs).padStart(2, '0')
}

export function slugify(text: string): string {
  const result = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return result || 'lesson'
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    pdf: 'application/pdf',
    md: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    srt: 'text/plain',
    vtt: 'text/vtt',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

export function getLessonType(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'text/markdown') return 'MARKDOWN'
  if (mimeType.startsWith('text/html')) return 'HTML'
  if (mimeType === 'application/json') return 'JSON'
  if (mimeType === 'text/plain') return 'TEXT'
  if (mimeType === 'text/vtt') return 'VTT'
  if (mimeType.startsWith('image/')) return 'IMAGE'
  return 'OTHER'
}

export function isVideoType(type: string): boolean {
  return type === 'VIDEO'
}

export function isDocumentType(type: string): boolean {
  return ['PDF', 'MARKDOWN', 'HTML'].includes(type)
}