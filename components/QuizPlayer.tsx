'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Edit3, HelpCircle, RefreshCw, XCircle } from 'lucide-react'
import type { QuizCache } from '@/lib/quiz-types'

interface QuizPlayerProps {
  quiz: QuizCache
  lessonId: string
  courseId: string
  moduleId: string
  onCompleted?: () => void
}

export function QuizPlayer({ quiz, lessonId, courseId, moduleId, onCompleted }: QuizPlayerProps) {
  const router = useRouter()
  const [quizData, setQuizData] = useState(quiz)
  const [started, setStarted] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [topicDraft, setTopicDraft] = useState(quiz.topic)
  const [editingTopic, setEditingTopic] = useState(false)

  const answeredCount = useMemo(
    () => Object.values(selectedAnswers).filter((value) => value !== null && value !== undefined).length,
    [selectedAnswers]
  )

  const score = useMemo(() => {
    return quizData.questions.reduce((sum, question) => {
      const answer = selectedAnswers[question.id]
      return sum + (typeof answer === 'number' && answer === question.answerIndex ? 1 : 0)
    }, 0)
  }, [quizData.questions, selectedAnswers])

  const totalQuestions = quizData.questions.length
  const passed = totalQuestions > 0 && score / totalQuestions >= 0.8

  const startQuiz = () => setStarted(true)

  const chooseAnswer = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }))
  }

  const submitQuiz = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          courseId,
          moduleId,
          score,
          totalQuestions,
          passed,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save quiz attempt')
      }

      setSubmitted(true)
      onCompleted?.()
      router.refresh()
    } catch (error) {
      console.error('Quiz submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const refreshQuiz = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          topic: topicDraft,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to fetch quiz')
      }

      const data = await response.json() as { quiz?: QuizCache }
      if (data.quiz) {
        setQuizData(data.quiz)
        setSelectedAnswers({})
        setStarted(false)
        setSubmitted(false)
      }
      setEditingTopic(false)
      router.refresh()
    } catch (error) {
      console.error('Quiz refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!started) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Quiz
                </Badge>
                <Badge variant="outline">{quizData.questions.length} questions</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditingTopic((value) => !value)}
              >
                <Edit3 className="h-4 w-4" />
                Edit Topic
              </Button>
            </div>

            <CardTitle className="text-2xl">{quizData.title}</CardTitle>
            <CardDescription>{quizData.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {editingTopic && (
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Override the topic and refresh the quiz cache.
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} placeholder="Type a new quiz topic" />
                  <Button type="button" onClick={refreshQuiz} disabled={isRefreshing} className="gap-2">
                    <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    {isRefreshing ? 'Refreshing...' : 'Fetch Quiz'}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">Source:</span> {quizData.source.toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-foreground">Topic:</span> {quizData.topic}
              </div>
              <div>
                <span className="font-medium text-foreground">Questions:</span> {quizData.questions.length}
              </div>
              <div>
                <span className="font-medium text-foreground">Pass mark:</span> 80%
              </div>
            </div>

            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={startQuiz}>
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/80 px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Quiz in progress</p>
          <h2 className="text-xl font-semibold">{quizData.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Answered {answeredCount}/{totalQuestions}</Badge>
          <Badge variant="outline">Source: {quizData.source.toUpperCase()}</Badge>
        </div>
      </div>

      {quizData.questions.map((question, index) => {
        const selected = selectedAnswers[question.id]
        const answered = typeof selected === 'number'
        const isCorrect = submitted && selected === question.answerIndex
        const isWrong = submitted && answered && selected !== question.answerIndex

        return (
          <Card key={question.id} className="border-border/60 bg-card/80">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="mb-2">Question {index + 1}</Badge>
                  <CardTitle className="text-lg leading-snug">{question.prompt}</CardTitle>
                </div>
                {submitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
                {submitted && isWrong && <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => {
                  const active = selected === optionIndex
                  const revealCorrect = submitted && optionIndex === question.answerIndex
                  const revealWrong = submitted && active && optionIndex !== question.answerIndex

                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      onClick={() => !submitted && chooseAnswer(question.id, optionIndex)}
                      className={[
                        'rounded-lg border px-4 py-3 text-left transition-colors',
                        active ? 'border-primary bg-primary/10' : 'border-border/60 bg-background hover:bg-muted/40',
                        revealCorrect ? 'border-green-500/60 bg-green-500/10' : '',
                        revealWrong ? 'border-red-500/60 bg-red-500/10' : '',
                        submitted ? 'cursor-default' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        {submitted && revealCorrect && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                        {submitted && revealWrong && <XCircle className="h-4 w-4 text-red-400" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {submitted && question.explanation && (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {question.explanation}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/80 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {submitted ? (
            <span>
              Score: <span className="font-semibold text-foreground">{score}/{totalQuestions}</span> —{' '}
              <span className={passed ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {passed ? 'Passed' : 'Not passed yet'}
              </span>
            </span>
          ) : (
            <span>Pick an answer for each question, then submit your attempt.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!submitted ? (
            <Button type="button" onClick={submitQuiz} disabled={isSubmitting || answeredCount < totalQuestions}>
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => {
              setSubmitted(false)
              setStarted(false)
              setSelectedAnswers({})
            }}>
              Retry Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
