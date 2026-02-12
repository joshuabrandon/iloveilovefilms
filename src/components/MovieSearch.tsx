import { useState, useEffect } from 'react'
import axios from 'axios'
import { useMovieSearch } from '../hooks/useMovieSearch'
import { useGenreMap } from '../hooks/useGenreMap'
import { DraggableSearchResult } from './DraggableSearchResult'
import type { Movie } from '../types'

const TMDB_BASE = 'https://api.themoviedb.org/3'

interface Props {
  apiKey: string
  usedMovieIds: Set<number>
  selectedMovieId: number | null
  onSelectMovie: (movie: Movie, pos: { x: number; y: number }) => void
}

export function MovieSearch({ apiKey, usedMovieIds, selectedMovieId, onSelectMovie }: Props) {
  const [query, setQuery] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [runtimeMap, setRuntimeMap] = useState<Map<number, number | null>>(new Map())
  const { results, loading, error, search } = useMovieSearch(apiKey)
  const genreMap = useGenreMap(apiKey)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (!apiKey && val.trim()) {
      setShowWarning(true)
      return
    }
    setShowWarning(false)
    search(val)
  }

  const handleClear = () => {
    setQuery('')
    setShowWarning(false)
    search('')
  }

  // Fetch runtime for visible results
  useEffect(() => {
    if (!apiKey || results.length === 0) return
    const missing = results.filter(m => !runtimeMap.has(m.id))
    if (missing.length === 0) return

    const controller = new AbortController()
    Promise.all(
      missing.map(m =>
        axios
          .get(`${TMDB_BASE}/movie/${m.id}`, {
            params: { api_key: apiKey },
            signal: controller.signal,
          })
          .then(res => ({ id: m.id, runtime: res.data.runtime as number | null }))
          .catch(() => ({ id: m.id, runtime: null }))
      )
    ).then(entries => {
      setRuntimeMap(prev => {
        const next = new Map(prev)
        for (const e of entries) next.set(e.id, e.runtime)
        return next
      })
    })

    return () => controller.abort()
  }, [apiKey, results]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableResults = results.filter(m => !usedMovieIds.has(m.id))

  return (
    <div className="movie-search">
      <div className="search-header">
        <h2>Add Movies</h2>
      </div>
      <div className="search-input-wrap">
        <input
          type="text"
          placeholder="Search for a movie..."
          value={query}
          onChange={handleChange}
          className="search-input"
        />
        {query.length > 0 && (
          <button className="search-clear-btn" onClick={handleClear} title="Clear search" type="button">
            ×
          </button>
        )}
      </div>
      {showWarning && (
        <div className="no-key-banner">
          <span>No API key set. Go to Settings to configure one.</span>
          <button className="dismiss-btn" onClick={() => setShowWarning(false)}>×</button>
        </div>
      )}
      {error && <p className="search-error">{error}</p>}
      {loading && <p className="search-loading">Searching...</p>}
      <div className="search-results">
        {availableResults.map(movie => (
          <DraggableSearchResult
            key={movie.id}
            movie={movie}
            isSelected={movie.id === selectedMovieId}
            genreMap={genreMap}
            runtime={runtimeMap.get(movie.id)}
            onSelect={onSelectMovie}
          />
        ))}
      </div>
    </div>
  )
}
