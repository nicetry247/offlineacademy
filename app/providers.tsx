'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/ThemeToggle'
import { ToastProvider } from '@/hooks/use-toast'
import { SplashScreen } from '@/components/SplashScreen'

export function Providers({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = React.useState(true)

  // Safety fallback: force hide after 5 seconds max
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ThemeProvider>
      <ToastProvider>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} minDuration={1500} />
        )}
        {!showSplash && children}
      </ToastProvider>
    </ThemeProvider>
  )
}