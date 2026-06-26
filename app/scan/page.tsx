'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Database, FolderOpen, Play } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/Header'

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [coursesRoot, setCoursesRoot] = useState('./My_Courses')
  const [result, setResult] = useState<{
    coursesCreated: number
    coursesUpdated: number
    modulesCreated: number
    modulesUpdated: number
    lessonsCreated: number
    lessonsUpdated: number
    errors: string[]
    duration: number
  } | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  React.useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.coursesRoot) setCoursesRoot(data.coursesRoot)
      })
      .catch(() => {})
  }, [])

  const handleScan = async () => {
    setScanning(true)
    setResult(null)
    setLogs([])
    addLog('Starting scan...')

    try {
      const response = await fetch('/api/scan', { method: 'POST' })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Scan failed')
      }

      setResult(data)
      addLog(`Scan completed in ${data.duration}ms`)
      addLog(`Courses: ${data.coursesCreated} created, ${data.coursesUpdated} updated`)
      addLog(`Modules: ${data.modulesCreated} created, ${data.modulesUpdated} updated`)
      addLog(`Lessons: ${data.lessonsCreated} created, ${data.lessonsUpdated} updated`)
      
      if (data.errors.length > 0) {
        data.errors.forEach((err: string) => addLog(`ERROR: ${err}`))
      }
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showScanButtons={true} onQuickScan={handleScan} coffeeUrl="https://ko-fi.com/nicetry247" />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Scan Courses</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scans your <code className="bg-muted px-1.5 py-0.5 rounded">My_Courses/</code> directory for new content. 
            Courses are detected from the folder tree below.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Start Scan
            </CardTitle>
            <CardDescription>
              Recursively scans for courses, modules, and lessons. Updates existing records, adds new ones, and keeps renamed display titles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleScan} 
              disabled={scanning} 
              className="w-full gap-2"
              size="lg"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Start Scan
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Quick scan skips video metadata for speed. For full scan with metadata, use the Scan page.
            </p>
          </CardContent>
        </Card>

        {result && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Scan Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{result.coursesCreated + result.coursesUpdated}</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{result.modulesCreated + result.modulesUpdated}</p>
                  <p className="text-sm text-muted-foreground">Modules</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{result.lessonsCreated + result.lessonsUpdated}</p>
                  <p className="text-sm text-muted-foreground">Lessons</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Completed in {result.duration}ms
              </div>
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Scan Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground mb-1">{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Expected Folder Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto text-left leading-6 whitespace-pre">
{coursesRoot || './My_Courses'}/
├── Course Name 1/
│   ├── 01 - Introduction/
│   │   ├── 01 - Introduction.mp4
│   │   ├── 01 - Introduction.srt
│   │   ├── 02 - Overview.pdf
│   │   └── 03 - Notes.txt
│   ├── 02 - Advanced/
│   │   ├── 01 - Deep Dive.mp4
│   │   └── 01 - Deep Dive.vtt
│   └── cover.jpg   ← optional thumbnail
├── Course Name 2/
│   ├── Module A/
│   │   ├── lesson1.mp4
│   │   ├── lesson1.srt
│   │   └── notes.md
│   └── Module B/
│       └── lesson1.json
└── Course Name 3/
    └── Module 1/
        ├── video1.mp4
        ├── diagram.pdf
        └── README.txt
            </pre>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p><strong>How the scanner reads it:</strong> course folder → module folder → lesson files.</p>
              <p><strong>Matching rule:</strong> subtitle files should share the same base name as the video, like <code className="bg-background px-1.5 py-0.5 rounded">lesson.mp4</code> + <code className="bg-background px-1.5 py-0.5 rounded">lesson.srt</code>.</p>
              <p><strong>Sorting:</strong> numeric prefixes like <code className="bg-background px-1.5 py-0.5 rounded">01</code>, <code className="bg-background px-1.5 py-0.5 rounded">02</code>, <code className="bg-background px-1.5 py-0.5 rounded">10</code> keep lessons in learning order.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}