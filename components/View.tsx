'use client'

import { useState, useEffect } from 'react'
import type { Entry } from '@/app/page'
import Notebook from './Notebook'
import StickyBoard from './StickyBoard'

type Props = { entries: Entry[] }

export default function View({ entries }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsMobile(/iPhone|iPod|Android/i.test(ua) || window.innerWidth < 768)
  }, [])

  if (isMobile === null) return null
  return isMobile ? <StickyBoard entries={entries} /> : <Notebook entries={entries} />
}
