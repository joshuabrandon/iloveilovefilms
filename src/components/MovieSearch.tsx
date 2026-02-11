import { useState } from 'react'
import { useMovieSearch } from '../hooks/useMovieSearch'
import { DraggableSearchResult } from './DraggableSearchResult'
import type { Movie } from '../types'

interface Props {
  apiKey: string
  usedMovieIds: Set<number>
  selectedMovieId: number | null
  onSelectMovie: (movie: Movie) => void
}

export function MovieSearch({ apiKey, usedMovieIds, selectedMovieId, onSelectMovie }: Props) {
  const [query, setQuery] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const { results, loading, error, search } = useMovieSearch(apiKey)

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

  const availableResults = results.filter(m => !usedMovieIds.has(m.id))

  return (
    <div className="movie-search">
      <div className="search-header">
        <h2>Add Movies</h2>
      </div>
      <input
        type="text"
        placeholder="Search for a movie..."
        value={query}
        onChange={handleChange}
        className="search-input"
      />
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
            onSelect={onSelectMovie}
          />
        ))}
      </div>
    </div>
  )
}
