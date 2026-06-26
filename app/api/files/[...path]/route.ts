import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync, statSync, createReadStream } from 'fs'
import { join, resolve } from 'path'
import { getCoursesRootPath } from '@/lib/scanner'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    
    // Security: resolve and validate path is within COURSES_ROOT
    const coursesRoot = resolve(await getCoursesRootPath())
    const requestedPath = resolve(join(coursesRoot, filePath))
    
    // Prevent directory traversal
    if (!requestedPath.startsWith(coursesRoot)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // Helper: try to find file with alternative extensions (e.g., .svg vs .png)
    const findActualFile = async (basePath: string): Promise<string | null> => {
      const extensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp']
      for (const ext of extensions) {
        const tryPath = basePath.replace(/\.[^.]+$/, '') + ext
        if (existsSync(tryPath)) return tryPath
      }
      return null
    }
    
    // Check if file exists
    let actualPath = requestedPath
    if (!existsSync(actualPath)) {
      // Try alternative extensions (for thumbnails with wrong extension requests)
      const foundPath = await findActualFile(requestedPath)
      if (foundPath) {
        actualPath = foundPath
      } else {
        return new NextResponse('Not Found', { status: 404 })
      }
    }
    
    const stats = statSync(actualPath)
    
    // Don't serve directories
    if (stats.isDirectory()) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    const fileSize = stats.size
    const range = request.headers.get('range')
    
    // Determine content type from ACTUAL file extension
    const actualExt = actualPath.split('.').pop()?.toLowerCase()
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
      md: 'text/markdown; charset=utf-8',
      html: 'text/html; charset=utf-8',
      htm: 'text/html; charset=utf-8',
      json: 'application/json; charset=utf-8',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      srt: 'text/plain; charset=utf-8',
      vtt: 'text/vtt; charset=utf-8',
      txt: 'text/plain; charset=utf-8',
    }
    const contentType = mimeTypes[actualExt || ''] || 'application/octet-stream'
    
    // Handle range requests (video seeking)
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1
      
      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        })
      }
      
      const stream = createReadStream(actualPath, { start, end })
      
      // Set Content-Disposition to inline for previewable file types
      const previewableTypes = ['pdf', 'markdown', 'html', 'plain', 'json', 'vtt', 'srt']
      const isPreviewable = previewableTypes.some(t => contentType.includes(t))
      const contentDisposition = isPreviewable ? 'inline' : 'attachment'
      
      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': `${contentDisposition}; filename="${actualPath.split('/').pop()}"`,
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }
    
    // Full file response
    const stream = createReadStream(actualPath)
    
    // Set Content-Disposition to inline for previewable file types
    const previewableTypes = ['pdf', 'markdown', 'html', 'plain', 'json', 'vtt', 'srt']
    const isPreviewable = previewableTypes.some(t => contentType.includes(t))
    const contentDisposition = isPreviewable ? 'inline' : 'attachment'
    
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `${contentDisposition}; filename="${actualPath.split('/').pop()}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}