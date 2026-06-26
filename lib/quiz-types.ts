export type QuizSource = 'the-trivia-api' | 'quizapi'

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation?: string
}

export type QuizCache = {
  version: 1
  source: QuizSource
  topic: string
  title: string
  description: string
  fetchedAt: string
  updatedAt: string
  questions: QuizQuestion[]
}

export type QuizAttemptResult = {
  score: number
  totalQuestions: number
  passed: boolean
}

export function cleanQuizTopic(input: string) {
  return input
    .replace(/quiz[_-]?cache/gi, '')
    .replace(/^\d+[\s._-]*/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function titleCase(input: string) {
  return input
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function normalizeQuizTopic(input: string) {
  const cleaned = cleanQuizTopic(input)
  return cleaned.length > 0 ? titleCase(cleaned) : 'General Knowledge'
}
