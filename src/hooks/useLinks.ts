import { useState, useEffect, useCallback } from 'react'
import type { QuickLink } from '../types'
import { readJson, writeJson } from '../lib/storage'

const FILE = 'links.json'

export function useLinks() {
  const [links, setLinks] = useState<QuickLink[]>([])

  useEffect(() => {
    readJson<QuickLink[]>(FILE).then(data => {
      if (data) setLinks(data)
    })
  }, [])

  const persist = useCallback(async (next: QuickLink[]) => {
    setLinks(next)
    await writeJson(FILE, next)
  }, [])

  const addLink = useCallback(
    async (link: QuickLink) => {
      await persist([...links, link])
    },
    [links, persist],
  )

  const removeLink = useCallback(
    async (id: string) => {
      await persist(links.filter(l => l.id !== id))
    },
    [links, persist],
  )

  return { links, addLink, removeLink }
}
