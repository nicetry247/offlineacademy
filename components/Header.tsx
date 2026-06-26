'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, Settings, Plus, BookOpen, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

interface HeaderProps {
  showSearchFilter?: boolean
  showScanButtons?: boolean
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
  onSearchClick?: () => void
  onFilterClick?: () => void
  onQuickScan?: () => void
  coffeeUrl?: string
}

export function Header({ 
  showSearchFilter = true, 
  showScanButtons = false, 
  showBackButton = false, 
  backHref, 
  backLabel,
  onSearchClick,
  onFilterClick,
  onQuickScan,
  coffeeUrl,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Back button - only on course/watch pages */}
            {showBackButton && backHref && (
              <Link 
                href={backHref} 
                className="header-control hover:text-primary hover:bg-primary/10 px-3 py-2"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"></path>
                  <path d="M19 12H5"></path>
                </svg>
                <span className="hidden sm:inline ml-1">{backLabel || 'Back'}</span>
              </Link>
            )}
            
            {/* Logo - Text + Icon */}
            <Link href="/" className="flex items-center gap-3" aria-label="OfflineAcademy Home">
              <img 
                src="/logo.png" 
                alt="OfflineAcademy" 
                className="h-10 w-auto object-contain transition-all duration-300"
                width="120"
                height="40"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
                  OfflineAcademy
                </h1>
                <p className="text-xs text-muted-foreground font-medium">Your Offline Learning Hub</p>
              </div>
            </Link>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-1.5">
            {showSearchFilter && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="header-control"
                  aria-label="Search"
                  onClick={onSearchClick}
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <span className="hidden lg:inline ml-1">Search</span>
                </Button>
              </>
            )}

            {showScanButtons && (
              <>
                {onQuickScan && (
                  <Button 
                    variant="default"
                    size="sm" 
                    className="btn-premium-primary"
                    onClick={onQuickScan}
                    disabled={false}
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6"></path>
                      <path d="M1 20v-6h6"></path>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span className="hidden lg:inline ml-1">Quick Scan</span>
                  </Button>
                )}
                <Link href="/scan">
                  <Button variant="ghost" size="sm" className="header-control" aria-label="Full Scan">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span className="hidden lg:inline ml-1">Full Scan</span>
                  </Button>
                </Link>
              </>
            )}

            <ThemeToggle />
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="header-control" aria-label="Settings">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0-1.51 1H3a2 2 0 0 1-2 2 2 2 0 0 1-2-2V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09z"></path>
                </svg>
              </Button>
            </Link>
            <Link href="/analytics" className="header-control p-1.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
            </Link>
            {coffeeUrl ? (
              <Link href={coffeeUrl} target="_blank" rel="noreferrer noopener" className="header-control p-1.5">
                <img src="/ko-fi-icon.gif" alt="Support on Ko-fi" className="h-8 w-8 object-contain" />
              </Link>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="header-control"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12"></line>
                  <line x1="4" x2="20" y1="6" y2="6"></line>
                  <line x1="4" x2="20" y1="18" y2="18"></line>
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/5 pt-4">
            <div className="flex flex-col gap-2">
              {showSearchFilter && (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start w-full"
                    onClick={() => {
                      onSearchClick?.()
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </>
              )}
              {showScanButtons && (
                <>
                  {onQuickScan && (
                    <Button 
                      variant="default"
                      className="justify-start w-full btn-premium-primary"
                      onClick={() => {
                        onQuickScan()
                        setMobileMenuOpen(false)
                      }}
                    >
                      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M1 20v-6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                      Quick Scan
                    </Button>
                  )}
                  <Link href="/scan" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="justify-start w-full">
                      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Full Scan
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/settings" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="justify-start w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Link href="/analytics" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="justify-start w-full">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}