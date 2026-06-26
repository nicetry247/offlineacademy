import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scanCoursesDirectory, scanCoursesFull } from '@/lib/scanner'

async function getQuizScanSettings() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['autoFetchQuizzes', 'quizApiSource'] } },
  })

  const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  return {
    autoFetchQuizzes: settingsMap.autoFetchQuizzes === 'true',
    quizApiSource: settingsMap.quizApiSource === 'the-trivia-api'
      ? 'the-trivia-api'
      : 'quizapi',
  } as const
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json().catch(() => ({}))
    const isFullScan = body.fullScan === true
    const quizSettings = await getQuizScanSettings()
    
    const result = isFullScan
      ? await scanCoursesFull(quizSettings)
      : await scanCoursesDirectory(quizSettings)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      ...result,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { error: 'Scan failed', details: String(error), success: false },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to trigger scan.' },
    { status: 405 }
  )
}