import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SETTINGS_KEYS = ['coursesRoot', 'autoFetchQuizzes', 'quizApiSource', 'quizApiKey'] as const
const SETTINGS_KEYS_ARRAY: string[] = [...SETTINGS_KEYS]

const singleSettingSchema = z.object({
  key: z.enum(['coursesRoot', 'autoFetchQuizzes', 'quizApiSource', 'quizApiKey']),
  value: z.union([z.string(), z.boolean()]),
})

const bulkSettingsSchema = z.object({
  coursesRoot: z.string().min(1).optional(),
  autoFetchQuizzes: z.union([z.boolean(), z.string()]).optional(),
  quizApiSource: z.enum(['the-trivia-api', 'quizapi']).optional(),
  quizApiKey: z.string().optional(),
})

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: SETTINGS_KEYS_ARRAY } },
    })

    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }

    // Default coursesRoot if not set
    if (!settingsMap.coursesRoot) {
      settingsMap.coursesRoot = './My_Courses'
    }

    if (!settingsMap.autoFetchQuizzes) {
      settingsMap.autoFetchQuizzes = 'false'
    }

    if (!settingsMap.quizApiSource) {
      settingsMap.quizApiSource = 'quizapi'
    }

    // Always include quizApiKey in response (empty string if not set)
    settingsMap.quizApiKey = settingsMap.quizApiKey || ''
    console.log('[DEBUG] Settings response:', JSON.stringify(settingsMap))

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const singleParsed = singleSettingSchema.safeParse(body)
    if (singleParsed.success) {
      const { key, value } = singleParsed.data
      const normalizedValue = typeof value === 'boolean' ? String(value) : value

      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: normalizedValue },
        create: { key, value: normalizedValue },
      })

      return NextResponse.json({ success: true, setting })
    }

    const bulkParsed = bulkSettingsSchema.safeParse(body)
    if (!bulkParsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: bulkParsed.error.flatten() },
        { status: 400 }
      )
    }

    const entries = Object.entries(bulkParsed.data).filter(([, value]) => value !== undefined)

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
    }

    const savedSettings = []
    for (const [key, value] of entries) {
      const normalizedValue = typeof value === 'boolean' ? String(value) : value
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: normalizedValue },
        create: { key, value: normalizedValue },
      })
      savedSettings.push(setting)
    }

    return NextResponse.json({ success: true, settings: savedSettings })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}