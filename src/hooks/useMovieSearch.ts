import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import type { Movie } from '../types'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export function useMovieSearch(apiKey: string) {
  const [results, setResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await axios.get(`${TMDB_BASE}/search/movie`, {
          params: { api_key: apiKey, query, language: 'en-US', page: 1 },
        })
        setResults(res.data.results.slice(0, 20))
      } catch {
        setError('Failed to search movies. Check your API key.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [apiKey])

  return { results, loading, error, search }
}
