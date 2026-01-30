import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Aethera | Solar Energy Financing Platform',
  description: 'DePIN-powered renewable energy financing. Invest in tokenized solar assets and earn real yield from clean energy production.',
  generator: 'Aethera Platform',
  keywords: ['solar', 'renewable energy', 'DePIN', 'tokenization', 'Stellar', 'blockchain', 'green investment'],
  icons: {
    icon: '/image.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased bg-white`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
