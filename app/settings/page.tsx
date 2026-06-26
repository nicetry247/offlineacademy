'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, FolderOpen, Eye, EyeOff, Key } from 'lucide-react'
import { Header } from '@/components/Header'

const DEFAULT_COURSES_ROOT = './My_Courses'
const DEFAULT_QUIZ_API_SOURCE = 'quizapi'

function parseBoolean(value: string | null | undefined) {
  return value === 'true'
}

export default function SettingsPage() {
  const [coursesRoot, setCoursesRoot] = useState(DEFAULT_COURSES_ROOT)
  const [autoFetchQuizzes, setAutoFetchQuizzes] = useState(false)
  const [quizApiSource, setQuizApiSource] = useState(DEFAULT_QUIZ_API_SOURCE)
  const [quizApiKey, setQuizApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setCoursesRoot(data.coursesRoot || DEFAULT_COURSES_ROOT)
        setAutoFetchQuizzes(parseBoolean(data.autoFetchQuizzes))
        setQuizApiSource(data.quizApiSource || DEFAULT_QUIZ_API_SOURCE)
        setQuizApiKey(data.quizApiKey || '')
        return
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }

    setCoursesRoot(DEFAULT_COURSES_ROOT)
    setAutoFetchQuizzes(false)
    setQuizApiSource(DEFAULT_QUIZ_API_SOURCE)
    setQuizApiKey('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus('idle')

    try {
      const saveSettings = {
        coursesRoot,
        autoFetchQuizzes: autoFetchQuizzes ? 'true' : 'false',
        quizApiSource,
        quizApiKey,
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveSettings),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save')
      }

      setStatus('success')
      setStatusMessage('Settings saved. Next scan will use the new directory.')
    } catch (error) {
      setStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  React.useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header coffeeUrl="https://ko-fi.com/nicetry247" />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure your OfflineAcademy preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Courses Directory
            </CardTitle>
            <CardDescription>
              The root folder where OfflineAcademy scans for courses. Use an absolute path for best results.
              Add course folders using the structure shown on the Scan page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="coursesRoot">Courses Root Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="coursesRoot"
                    placeholder="/absolute/path/to/courses"
                    value={coursesRoot}
                    onChange={(e) => setCoursesRoot(e.target.value)}
                    className="flex-1"
                    disabled={saving}
                  />
                  <Button type="submit" disabled={saving} className="gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ display: saving ? 'block' : 'none' }} />
                    <Save className="h-4 w-4" style={{ display: saving ? 'none' : 'block' }} />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Current default: ./My_Courses</p>
              </div>

              <div className="border-t pt-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Quiz Settings</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quizApiSource">Quiz API Source</Label>
                  <Select value={quizApiSource} onValueChange={setQuizApiSource}>
                    <SelectTrigger id="quizApiSource" disabled={saving}>
                      <SelectValue placeholder="Select quiz API" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quizapi">QuizAPI (requires API key)</SelectItem>
                      <SelectItem value="the-trivia-api">The Trivia API (no key needed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Source used when auto-fetching quiz content.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="autoFetchQuizzes">Auto-Fetch Quizzes</Label>
                      <p className="text-xs text-muted-foreground">Fetch quiz data when a module is opened.</p>
                    </div>
                    <input
                      id="autoFetchQuizzes"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={autoFetchQuizzes}
                      onChange={(event) => setAutoFetchQuizzes(event.target.checked)}
                      disabled={saving}
                    />
                  </div>
                </div>

                {quizApiSource === 'quizapi' && (
                  <div className="space-y-2">
                    <Label htmlFor="quizApiKey">QuizAPI Key <span className="text-xs text-muted-foreground font-normal">(secret)</span></Label>
                    <div className="relative">
                      <Input
                        id="quizApiKey"
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="Enter your QuizAPI key"
                        value={quizApiKey}
                        onChange={(e) => setQuizApiKey(e.target.value)}
                        className="pr-10"
                        disabled={saving}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Get your key at <a href="https://quizapi.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">quizapi.io</a>. Stored securely in local database.</p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Quiz settings</p>
                  <p>Auto-fetch is {autoFetchQuizzes ? 'enabled' : 'disabled'} with source <code className="bg-background px-2 py-1 rounded">{quizApiSource}</code>.</p>
                  {quizApiSource === 'quizapi' && quizApiKey && (
                    <p className="mt-1 text-green-500">✓ QuizAPI key configured ({quizApiKey.length} characters)</p>
                  )}
                  {quizApiSource === 'quizapi' && !quizApiKey && (
                    <p className="mt-1 text-amber-500">⚠ QuizAPI selected but no API key configured. Quizzes will fall back to The Trivia API.</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={saving} className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" style={{ display: saving ? 'block' : 'none' }} />
                <Save className="h-4 w-4" style={{ display: saving ? 'none' : 'block' }} />
                {saving ? 'Saving...' : 'Save settings'}
              </Button>

              {status === 'success' && (
                <p className="text-sm text-green-500">Settings saved successfully.</p>
              )}
              {status === 'error' && (
                <p className="text-sm text-red-500">{statusMessage}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}