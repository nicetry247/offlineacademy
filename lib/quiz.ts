import 'server-only'

import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import { dirname, join, relative, basename } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { QuizCache, QuizQuestion, QuizSource } from './quiz-types'
import { normalizeQuizTopic } from './quiz-types'

const QUIZ_CACHE_FILE = 'quiz_cache.json'
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.flv', '.wmv'])
const ONLINE_QUIZ_SOURCES = new Set<QuizSource>(['the-trivia-api', 'quizapi'])

async function getQuizApiKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: 'quizApiKey' } })
  return setting?.value || null
}

function introCandidate(input: string) {
  return normalizeQuizTopic(input)
    .toLowerCase()
    .replace(/^\d+[\s._-]*/g, '')
    .replace(/^s\d+[\s._-]*/g, '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isIntroQuizTopic(input: string) {
  const value = introCandidate(input)
  return /(^|\b)(intro|introduction|introduce|introducing|welcome|overview|course overview|course introduction|getting started|getting started overview|websites you may like|exercise files|bonus lecture|conclusion|footnote|footnotes|endnote|endnotes|appendix|appendices|bibliography|references|notes|supplemental)(\b|$)/.test(value)
}

function isOnlineQuizSource(source: unknown): source is QuizSource {
  return typeof source === 'string' && ONLINE_QUIZ_SOURCES.has(source as QuizSource)
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildQuizTitle(topic: string) {
  const displayTopic = topic.split(' | ')[0].split(' - ')[0]
  return `Quiz: ${normalizeQuizTopic(displayTopic)}`
}

function buildQuizDescription(topic: string, source: QuizSource) {
  return `Auto-generated practice quiz for ${normalizeQuizTopic(topic)} from ${source.toUpperCase()}.`
}

function triviaQuestionText(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'text' in value) {
    return String((value as { text?: unknown }).text || 'Question')
  }
  return 'Question'
}

function triviaCategoriesForTopic(topic: string): string[] {
  const lower = topic.toLowerCase()
  const categories = new Set<string>()

  if (/history|war|ancient|medieval|empire|civilization/.test(lower)) categories.add('history')
  if (/geography|country|capital|map|continent|river|mountain|city/.test(lower)) categories.add('geography')
  if (/science|biology|chemistry|physics|space|astronomy|medical|medicine|anatomy/.test(lower)) categories.add('science')
  if (/music|song|album|artist|band/.test(lower)) categories.add('music')
  if (/sport|football|soccer|basketball|baseball|tennis|golf/.test(lower)) categories.add('sport_and_leisure')
  if (/movie|film|television|tv|actor|cinema/.test(lower)) categories.add('film_and_tv')
  if (/\bart\b|literature|book|novel|author|poetry/.test(lower)) categories.add('arts_and_literature')
  if (/food|drink|cuisine|recipe|cooking/.test(lower)) categories.add('food_and_drink')
  if (/culture|society|language|religion|mythology|politics/.test(lower)) categories.add('society_and_culture')
  if (/general knowledge|trivia/.test(lower)) categories.add('general_knowledge')

  return Array.from(categories)
}

function isTechnicalQuizTopic(topic: string) {
  return /terraform|hcl|tfstate|provider block|resource block|terraform manifest|infrastructure as code|\biac\b|aws|ec2|s3|iam|vpc|rds|cloudfront|route 53|lambda|devops|docker|kubernetes|\bk8s\b|linux|ansible|azure|ci\/cd|pipeline/.test(topic.toLowerCase())
}

function quizApiTagsForTopic(topic: string) {
  const lower = topic.toLowerCase()
  const tags = new Set<string>()

  if (/terraform|hcl|tfstate|provider block|resource block|terraform manifest|infrastructure as code|\biac\b/.test(lower)) tags.add('terraform')
  else if (/typescript|\bts\b|\.d\.ts|type guard|interface/.test(lower)) tags.add('typescript')

  if (!tags.has('terraform')) {
    if (/aws|ec2|s3|iam|vpc|rds|cloudfront|route 53|lambda/.test(lower)) tags.add('aws')
    if (/docker|container|image/.test(lower)) tags.add('docker')
    if (/kubernetes|\bk8s\b|pod|deployment|cluster/.test(lower)) tags.add('kubernetes')
    if (/linux|bash|shell|systemd|red hat|rhel/.test(lower)) tags.add('linux')
    if (/sql|mysql|postgres|database/.test(lower)) tags.add('sql')
    if (/ansible|playbook/.test(lower)) tags.add('ansible')
    if (/azure|devops pipeline|ci_cd|ci\/cd/.test(lower)) tags.add('azure')
  }

  if (tags.size) return Array.from(tags).slice(0, 4).join(',')

  return topic
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/[\s,/_-]+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !['the', 'and', 'for', 'with', 'module', 'modules', 'lesson', 'course', 'quiz', 'part', 'step', 'introduction', 'create', 'test', 'build'].includes(word))
    .slice(0, 4)
    .join(',')
}

function focusKeywordsForTopic(topic: string) {
  const stopWords = new Set([
    'step', 'test', 'create', 'using', 'with', 'about', 'introduction', 'understand',
    'learn', 'build', 'building', 'manually', 'commands', 'command', 'execute',
    'executing', 'clean', 'course', 'lesson', 'video', 'quiz', 'what', 'which', 'this',
  ])

  return Array.from(new Set(
    topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4)
      .filter((word) => !stopWords.has(word))
  )).slice(0, 30)
}

function scoreQuizApiItem(item: Record<string, unknown>, focusKeywords: string[]) {
  const searchable = [
    item.text,
    item.question,
    item.explanation,
    item.quizTitle,
    item.category,
    Array.isArray(item.tags) ? item.tags.join(' ') : '',
  ].join(' ').toLowerCase()

  return focusKeywords.filter((keyword) => searchable.includes(keyword)).length
}

function selectRelevantQuizApiItems(items: Array<Record<string, unknown>>, topic: string) {
  const focusKeywords = focusKeywordsForTopic(topic)
  if (!focusKeywords.length) return items.slice(0, 10)

  const ranked = items
    .map((item, index) => ({ item, index, score: scoreQuizApiItem(item, focusKeywords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const relevant = ranked.filter((entry) => entry.score > 0).map((entry) => entry.item)
  return (relevant.length >= 5 ? relevant : ranked.map((entry) => entry.item)).slice(0, 10)
}

function mapTriviaApiResults(topic: string, results: Array<Record<string, unknown>>): QuizCache {
  const questions: QuizQuestion[] = results.map((result) => {
    const questionText = decodeHtmlEntities(triviaQuestionText(result.question))
    const correctAnswer = decodeHtmlEntities(String(result.correctAnswer || ''))
    const incorrectAnswers = Array.isArray(result.incorrectAnswers)
      ? result.incorrectAnswers.map((answer) => decodeHtmlEntities(String(answer)))
      : []
    const options = shuffleArray([correctAnswer, ...incorrectAnswers].filter(Boolean))
    const answerIndex = Math.max(0, options.findIndex((option) => option === correctAnswer))

    return {
      id: randomUUID(),
      prompt: questionText,
      options,
      answerIndex,
      explanation: correctAnswer ? `Correct answer: ${correctAnswer}` : undefined,
    }
  })

  const now = new Date().toISOString()
  return {
    version: 1,
    source: 'the-trivia-api',
    topic,
    title: buildQuizTitle(topic),
    description: buildQuizDescription(topic, 'the-trivia-api'),
    fetchedAt: now,
    updatedAt: now,
    questions,
  }
}

async function fetchTriviaApiQuiz(topic: string): Promise<QuizCache> {
  const categories = triviaCategoriesForTopic(topic)
  const categoryList = categories.length ? categories.join(',') : 'general_knowledge'

  const url = new URL('https://the-trivia-api.com/v2/questions')
  url.searchParams.set('limit', '10')
  url.searchParams.set('categories', categoryList)
  url.searchParams.set('difficulty', 'medium')

  let response = await fetch(url.toString())
  if (!response.ok || response.status === 404) {
    const fallback = new URL('https://the-trivia-api.com/v2/questions')
    fallback.searchParams.set('limit', '10')
    fallback.searchParams.set('categories', 'general_knowledge')
    fallback.searchParams.set('difficulty', 'medium')
    response = await fetch(fallback.toString())
  }

  if (!response.ok) {
    throw new Error(`The Trivia API request failed with status ${response.status}`)
  }

  const data = await response.json() as Array<Record<string, unknown>>
  if (!data.length) {
    throw new Error('The Trivia API returned no quiz questions')
  }

  return mapTriviaApiResults(topic, data)
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function cleanVideoTitle(fileName: string) {
  return normalizeQuizTopic(
    basename(fileName).replace(/\.[^.]+$/, '')
      .replace(/^\d+[\s._-]*/g, '')
      .replace(/^step[\s._-]*\d+[\s._-]*/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function topicDomainAnchorForPath(modulePath: string) {
  const courseFolder = normalizeQuizTopic(basename(dirname(modulePath)))
  const lower = courseFolder.toLowerCase()

  if (/terraform|hashicorp/.test(lower)) return 'Terraform'
  if (/aws|amazon web services/.test(lower)) return 'AWS'
  if (/docker/.test(lower)) return 'Docker'
  if (/kubernetes|k8s/.test(lower)) return 'Kubernetes'
  if (/linux|red hat|rhel/.test(lower)) return 'Linux'
  if (/ansible/.test(lower)) return 'Ansible'
  if (/azure/.test(lower)) return 'Azure'

  return ''
}

async function buildQuizTopic(baseTopic: string, modulePath?: string): Promise<string> {
  if (modulePath) {
    try {
      const entries = await readdir(modulePath, { withFileTypes: true })
      const videoTitles = entries
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && VIDEO_EXTENSIONS.has(`.${entry.name.split('.').pop()?.toLowerCase() || ''}`))
        .sort((a, b) => naturalCompare(a.name, b.name))
        .map((entry) => cleanVideoTitle(entry.name))
        .filter(Boolean)
        .filter((title) => !isIntroQuizTopic(title))
        .filter((part, index, all) => all.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index)
        .slice(0, 16)

      const domainAnchor = topicDomainAnchorForPath(modulePath)
      const videoTopicParts = domainAnchor && !videoTitles.some((title) => title.toLowerCase().includes(domainAnchor.toLowerCase()))
        ? [...videoTitles, domainAnchor]
        : videoTitles

      if (videoTopicParts.length) {
        return videoTopicParts.join(' | ')
      }
    } catch {
      // Video-title enrichment must not block quiz generation.
    }
  }

  return normalizeQuizTopic(baseTopic)
}

async function fetchQuizApiQuiz(topic: string, apiKey: string): Promise<QuizCache> {
  if (!apiKey) {
    throw new Error('QUIZAPI_KEY is not configured')
  }

  const url = new URL('https://quizapi.io/api/v1/questions')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('limit', '50')
  const tags = quizApiTagsForTopic(topic)
  if (tags) {
    url.searchParams.set('tags', tags)
  }
  if (tags.split(',').includes('terraform')) {
    url.searchParams.set('category', 'DevOps')
  }
  url.searchParams.set('random', 'true')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`QuizAPI request failed with status ${response.status}`)
  }

  const payload = await response.json() as unknown
  const data = Array.isArray(payload)
    ? payload as Array<Record<string, unknown>>
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Array<Record<string, unknown>> }).data
      : []

  if (!data.length) {
    throw new Error('QuizAPI returned no quiz questions')
  }

  const selectedData = selectRelevantQuizApiItems(data, topic)
  const questions: QuizQuestion[] = selectedData.map((item) => {
    const rawAnswers = item.answers
    let optionEntries: Array<{ key: string; value: string; isCorrect: boolean }> = []

    if (Array.isArray(rawAnswers)) {
      optionEntries = rawAnswers
        .filter((answer): answer is Record<string, unknown> => Boolean(answer) && typeof answer === 'object')
        .map((answer, index) => ({
          key: String(answer.id || index),
          value: decodeHtmlEntities(String(answer.text || '')),
          isCorrect: Boolean(answer.isCorrect),
        }))
        .filter((entry) => Boolean(entry.value))
    } else {
      const answers = rawAnswers && typeof rawAnswers === 'object' ? (rawAnswers as Record<string, string | null>) : {}
      const correctAnswers = item.correct_answers && typeof item.correct_answers === 'object'
        ? (item.correct_answers as Record<string, string>)
        : {}
      optionEntries = Object.entries(answers)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => ({
          key,
          value: decodeHtmlEntities(String(value)),
          isCorrect: String(correctAnswers[`${key}_correct`] || '').toLowerCase() === 'true',
        }))
    }

    const options = optionEntries.map((entry) => entry.value)
    const answerIndex = optionEntries.findIndex((entry) => entry.isCorrect)

    return {
      id: randomUUID(),
      prompt: decodeHtmlEntities(String(item.text || item.question || 'Question')),
      options,
      answerIndex: Math.max(0, answerIndex),
      explanation: String(item.explanation || '') || undefined,
    }
  })

  const now = new Date().toISOString()
  return {
    version: 1,
    source: 'quizapi',
    topic,
    title: buildQuizTitle(topic),
    description: buildQuizDescription(topic, 'quizapi'),
    fetchedAt: now,
    updatedAt: now,
    questions,
  }
}

export async function fetchQuizBySource(topic: string, source: QuizSource, modulePath?: string): Promise<QuizCache> {
  const enrichedTopic = await buildQuizTopic(topic, modulePath)
  const technicalTopic = isTechnicalQuizTopic(enrichedTopic)

  // Fetch QuizAPI key from database
  const quizApiKey = await getQuizApiKey()

  if (source === 'quizapi' || technicalTopic) {
    if (!quizApiKey) {
      if (technicalTopic) {
        throw new Error('QUIZAPI_KEY is required for technical quiz topics. Configure it in Settings.')
      }
      console.warn('QuizAPI selected but QUIZAPI_KEY is not configured; falling back to The Trivia API.')
      return fetchTriviaApiQuiz(enrichedTopic)
    }

    try {
      return await fetchQuizApiQuiz(enrichedTopic, quizApiKey)
    } catch (error) {
      if (technicalTopic) {
        throw error
      }
      console.warn('QuizAPI quiz generation failed; falling back to The Trivia API:', error)
      return fetchTriviaApiQuiz(enrichedTopic)
    }
  }

  try {
    return await fetchTriviaApiQuiz(enrichedTopic)
  } catch (error) {
    if (!quizApiKey) {
      throw error
    }
    console.warn('The Trivia API quiz generation failed; falling back to QuizAPI:', error)
    return fetchQuizApiQuiz(enrichedTopic, quizApiKey)
  }
}

export async function loadQuizCache(cachePath: string): Promise<QuizCache | null> {
  try {
    const raw = await readFile(cachePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<QuizCache> & { source?: unknown }
    if (!parsed || !Array.isArray(parsed.questions)) return null
    if (!isOnlineQuizSource(parsed.source)) return null
    return parsed as QuizCache
  } catch {
    return null
  }
}

export async function writeQuizCache(cachePath: string, quiz: QuizCache) {
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, JSON.stringify(quiz, null, 2), 'utf8')
  return cachePath
}

export async function shouldSkipQuizGeneration(modulePath: string, topic: string) {
  if (isIntroQuizTopic(topic) || isIntroQuizTopic(basename(modulePath))) {
    return true
  }

  try {
    const entries = await readdir(modulePath, { withFileTypes: true })
    const videoTitles = entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && VIDEO_EXTENSIONS.has(`.${entry.name.split('.').pop()?.toLowerCase() || ''}`))
      .map((entry) => cleanVideoTitle(entry.name))
      .filter(Boolean)

    return videoTitles.length > 0 && videoTitles.every((title) => isIntroQuizTopic(title))
  } catch {
    return false
  }
}

export async function ensureModuleQuizCache(options: {
  modulePath: string
  topic: string
  source: QuizSource
  force?: boolean
}): Promise<{ quiz: QuizCache; cachePath: string; created: boolean } | null> {
  const cachePath = join(options.modulePath, QUIZ_CACHE_FILE)

  if (await shouldSkipQuizGeneration(options.modulePath, options.topic)) {
    return null
  }

  const existing = await loadQuizCache(cachePath)

  if (existing && !options.force) {
    return { quiz: existing, cachePath, created: false }
  }

  try {
    const quiz = await fetchQuizBySource(options.topic, options.source, options.modulePath)
    await writeQuizCache(cachePath, quiz)
    return { quiz, cachePath, created: !existing }
  } catch (error) {
    if (existing) {
      return { quiz: existing, cachePath, created: false }
    }
    console.error('Failed to generate quiz cache:', error)
    return null
  }
}

export function getQuizCachePath(modulePath: string) {
  return join(modulePath, QUIZ_CACHE_FILE)
}

export async function syncQuizLessonFromCache(options: {
  moduleId: string
  modulePath: string
  courseRoot: string
  topic?: string
  source?: QuizSource
  lessonOrder?: number
  autoFetch?: boolean
  force?: boolean
}): Promise<{ quiz: QuizCache; cachePath: string; lesson: { id: string; title: string; slug: string; type: string; filePath: string }; created: boolean } | null> {
  const cachePath = getQuizCachePath(options.modulePath)
  let quiz = await loadQuizCache(cachePath)

  if (!quiz && options.autoFetch) {
    const generated = await ensureModuleQuizCache({
      modulePath: options.modulePath,
      topic: options.topic || basename(options.modulePath),
      source: options.source || 'quizapi',
      force: options.force ?? false,
    })
    if (!generated) {
      return null
    }
    quiz = generated.quiz
  }

  if (!quiz) {
    return null
  }

  const existingLesson = await prisma.lesson.findUnique({
    where: { moduleId_slug: { moduleId: options.moduleId, slug: 'quiz' } },
    select: { id: true },
  })

  const filePath = relative(options.courseRoot, cachePath).replace(/\\\\/g, '/')
  const order = options.lessonOrder ?? await prisma.lesson.count({ where: { moduleId: options.moduleId } })
  const lesson = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: options.moduleId, slug: 'quiz' } },
    update: {
      title: quiz.title || 'Quiz',
      order,
      filePath,
      fileName: 'quiz_cache.json',
      mimeType: 'application/json',
      type: 'QUIZ',
      duration: null,
      thumbnail: null,
      subtitlePath: null,
    },
    create: {
      title: quiz.title || 'Quiz',
      slug: 'quiz',
      order,
      filePath,
      fileName: 'quiz_cache.json',
      mimeType: 'application/json',
      type: 'QUIZ',
      duration: null,
      thumbnail: null,
      subtitlePath: null,
      moduleId: options.moduleId,
    },
  })

  return {
    quiz,
    cachePath,
    lesson,
    created: !existingLesson,
  }
}
