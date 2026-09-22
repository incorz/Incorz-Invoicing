import type { Metadata } from 'next'
import { Unbounded } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Buzz Filing — Invoice Generator',
  description: 'Professional invoice generator for Buzz Filing — LLC Formation, ITIN, and business filing services.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
    shortcut: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`font-sans antialiased ${_unbounded.variable}`} style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
