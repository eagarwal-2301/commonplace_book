import type { Metadata } from 'next'
import { Cedarville_Cursive, Handlee, Liu_Jian_Mao_Cao, Nanum_Pen_Script, Caveat } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: "Eesha's Commonplace Book",
  description: 'A collection of words worth keeping.',
}

const cursive = Cedarville_Cursive({ weight: '400', subsets: ['latin'], variable: '--font-cursive' })
const handlee = Handlee({ weight: '400', subsets: ['latin'], variable: '--font-hand' })
const coverFont = Liu_Jian_Mao_Cao({ weight: '400', subsets: ['latin'], variable: '--font-cover' })
const notesFont = Nanum_Pen_Script({ weight: '400', subsets: ['latin'], variable: '--font-notes' })
const caveat = Caveat({ weight: '400', subsets: ['latin'], variable: '--font-annie' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cursive.variable} ${handlee.variable} ${coverFont.variable} ${notesFont.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  )
}
