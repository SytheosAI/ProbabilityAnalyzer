import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sports Probability Analyzer',
  description: 'Advanced AI-powered sports betting analysis platform with real-time odds, moneyline predictions, and parlay optimization',
  keywords: 'sports betting, probability analysis, moneyline predictions, parlay optimizer, odds analysis, sports analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900`}>
        {children}
      </body>
    </html>
  )
}