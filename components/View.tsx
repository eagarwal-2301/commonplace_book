'use client'

import { useState, useEffect } from 'react'
import type { Entry } from '@/app/page'
import Notebook from './Notebook'
import StickyBoard from './StickyBoard'

type Props = { entries: Entry[] }

export default function View({ entries }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () =>
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768
    setIsMobile(check())
    const handler = () => setIsMobile(check())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (isMobile === null) return null
  return isMobile ? <StickyBoard entries={entries} /> : <Notebook entries={entries} />
}
