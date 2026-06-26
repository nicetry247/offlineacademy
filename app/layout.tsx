import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'OfflineAcademy — Your Personal Offline Learning Center',
    template: '%s | OfflineAcademy',
  },
  description: 'A self-hosted, privacy-first learning platform for offline courses. Download, organize, and watch your educational content without internet.',
  keywords: ['offline learning', 'course platform', 'self-hosted', 'video courses', 'education', 'LMS'],
  authors: [{ name: 'OfflineAcademy' }],
  creator: 'OfflineAcademy',
  publisher: 'OfflineAcademy',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'http://localhost:6767',
    siteName: 'OfflineAcademy',
    title: 'OfflineAcademy — Your Personal Offline Learning Center',
    description: 'A self-hosted, privacy-first learning platform for offline courses.',
    images: [
      { url: '/og-image.svg', width: 1200, height: 630, alt: 'OfflineAcademy Dashboard' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OfflineAcademy',
    description: 'Your Personal Offline Learning Center',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e14' },
  ],
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon16x16.ico" sizes="16x16" type="image/x-icon" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        <meta name="theme-color" content="#10b981" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}>
        <Providers>{children}</Providers>
        <Script id="sw-registration" strategy="lazyOnload">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(reg => console.log('SW registered:', reg.scope))
              .catch(err => console.log('SW registration failed:', err))
          }`}
        </Script>
      </body>
    </html>
  )
}