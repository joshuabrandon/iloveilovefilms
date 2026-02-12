import { useState, useEffect } from 'react'
import axios from 'axios'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export function useGenreMap(apiKey: string): Map<number, string> {
  const [genreMap, setGenreMap] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (!apiKey) return
    axios
      .get(`${TMDB_BASE}/genre/movie/list`, {
        params: { api_key: apiKey, language: 'en-US' },
      })
      .then(res => {
        const map = new Map<number, string>()
        for (const g of res.data.genres as { id: number; name: string }[]) {
          map.set(g.id, g.name)
        }
        setGenreMap(map)
      })
      .catch(() => {/* ignore — genre names just won't display */})
  }, [apiKey])

  return genreMap
}
