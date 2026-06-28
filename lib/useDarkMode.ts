'use client'

import { useState, useEffect } from 'react'

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('dark-mode') === 'true') setDark(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark-mode', String(dark))
  }, [dark])

  return [dark, () => setDark(d => !d)]
}
