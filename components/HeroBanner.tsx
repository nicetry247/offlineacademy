'use client'

import * as React from 'react'
import { BookOpen, Play, ArrowRight, CheckCircle, Download, Monitor, Shield, Database, Zap, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cdefs%3E%3Cpattern id='hex' patternUnits='userSpaceOnUse' width='30' height='52'%3E%3Cpath d='M15 0 L30 10 L30 42 L15 52 L0 42 L0 10 Z' fill='none' stroke='%2310b981' stroke-width='0.5' stroke-opacity='0.15'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23hex)'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-background-elevated/80 backdrop-blur-xl border border-primary/20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M10 0 L20 6.67 L20 26.67 L10 33.33 L0 26.67 L0 6.67 Z' fill='none' stroke='%2310b981' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: '20px 20px',
                  }} />
                  <svg className="w-14 h-14 lg:w-16 lg:h-16 text-primary" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="bookHeroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#5eead4"/>
                        <stop offset="100%" stop-color="#0d9488"/>
                      </linearGradient>
                      <linearGradient id="playHeroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#fde047"/>
                        <stop offset="100%" stop-color="#f59e0b"/>
                      </linearGradient>
                      <filter id="heroGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    <path d="M25 20 L42 20 L42 80 L25 80 Z" stroke="url(#bookHeroGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M58 20 L75 20 L75 80 L58 80 Z" stroke="url(#bookHeroGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M25 20 Q50 12 75 20" stroke="url(#bookHeroGrad)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                    <path d="M25 80 Q50 88 75 80" stroke="url(#bookHeroGrad)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                    <path d="M50 80 L50 85" stroke="url(#bookHeroGrad)" stroke-width="2" stroke-linecap="round" fill="none"/>
                    <polygon points="43,38 43,62 63,50" fill="url(#playHeroGrad)" filter="url(#heroGlow)"/>
                    <polygon points="45,40 45,48 53,44" fill="#fde68a" opacity="0.5"/>
                  </svg>
                </div>
              </div>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent animate-fade-in">
              OfflineAcademy
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 animate-slide-up">
              Your Personal Offline Learning Center
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <span className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Privacy First
              </span>
              <span className="px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Fully Offline
              </span>
              <span className="px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-sm font-medium flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Self-Hosted
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link href="/scan">
                <Button size="lg" className="btn-premium-primary gap-2 px-8 py-3 text-base" style={{ minWidth: '180px' }}>
                  <Play className="h-5 w-5" /> Start Learning
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="lg" variant="ghost" className="gap-2 px-8 py-3 text-base border-primary/30 hover:bg-primary/10" style={{ minWidth: '180px' }}>
                  <Monitor className="h-5 w-5" /> View Demo
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-muted-foreground animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /><span>No tracking</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /><span>No accounts required</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /><span>Works offline</span></div>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="absolute -top-4 -right-4 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative glass-card-elevated rounded-2xl overflow-hidden border-primary/20 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-secondary-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground font-mono">OfflineAcademy - Dashboard</div>
                <div className="w-3 h-3 rounded-full bg-transparent" />
              </div>

              <div className="p-4 lg:p-6 space-y-6" style={{ minHeight: '420px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">OfflineAcademy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative hidden sm:block">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input type="text" placeholder="Search courses..." className="w-48 pl-8 pr-3 py-1.5 bg-secondary border border-secondary-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" readOnly />
                    </div>
                    <Button variant="ghost" size="sm" className="header-control"><Zap className="h-3.5 w-3.5" /><span className="hidden sm:inline">New</span></Button>
                    <Button variant="ghost" size="sm" className="header-control"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add</span></Button>
                    <Button variant="ghost" size="sm" className="header-control"><ArrowRight className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sort</span></Button>
                    <Button variant="ghost" size="sm" className="header-control"><Filter className="h-3.5 w-3.5" /><span className="hidden sm:inline">Filter</span></Button>
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 ml-1">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" /> Continue Watching
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { title: 'Tutorial: JavaScript', duration: '1h 23m', bg: 'bg-gradient-to-br from-primary/20 to-primary/5' },
                      { title: '1. Vercel is awesome', duration: '1h 15m', bg: 'bg-gradient-to-br from-gray-100/10 to-gray-200/5' },
                      { title: '4. Automation Platforms', duration: '1h 30m', bg: 'bg-gradient-to-br from-primary/10 to-blue-500/10' },
                    ].map((item, i) => (
                      <div key={i} className="group relative rounded-lg overflow-hidden">
                        <div className={`aspect-video ${item.bg} relative overflow-hidden`}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform opacity-0 group-hover:opacity-100">
                              <Play className="h-5 w-5 ml-1" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/50" style={{ width: `${30 + i * 20}%` }} />
                        </div>
                        <p className="text-xs text-foreground mt-1.5 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" /> Your Library
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: '[TutorialsHub] - Network Config', bg: 'bg-gradient-to-br from-blue-600/30 to-purple-600/20' },
                      { title: 'FreeTutorials101: Linux Shell', bg: 'bg-gradient-to-br from-green-500/30 to-teal-500/20' },
                      { title: 'FreeCoursesOnline: Code With Me', bg: 'bg-gradient-to-br from-purple-600/30 to-pink-500/20' },
                      { title: 'FreeCoursesLab: Academy Lab', bg: 'bg-gradient-to-br from-teal-500/30 to-cyan-500/20' },
                    ].map((item, i) => (
                      <div key={i} className="group relative rounded-lg overflow-hidden">
                        <div className={`aspect-video ${item.bg} relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02]`}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium line-clamp-2">{item.title}</div>
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
                              <Play className="h-4 w-4 ml-1 text-primary-foreground" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 w-48 glass-card p-3 animate-float">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                </div>
                <div><p className="font-medium text-foreground">Secure</p><p className="text-muted-foreground">Local only</p></div>
              </div>
            </div>
            <div className="absolute -bottom-6 right-4 w-48 glass-card p-3 animate-float" style={{ animationDelay: '1.5s' }}>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Download className="h-3.5 w-3.5 text-accent" />
                </div>
                <div><p className="font-medium text-foreground">Offline</p><p className="text-muted-foreground">No internet needed</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ArrowRight className="h-6 w-6 text-primary/50 rotate-90" />
      </div>
    </section>
  )
}