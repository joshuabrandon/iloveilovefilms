import { useState } from 'react'
import { useMovieSearch } from '../hooks/useMovieSearch'
import type { Movie, TierMovie } from '../types'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

interface Props {
  apiKey: string
  onAddMovie: (movie: TierMovie) => void
  onChangeApiKey: () => void
}

export function MovieSearch({ apiKey, onAddMovie, onChangeApiKey }: Props) {
  const [query, setQuery] = useState('')
  const { results, loading, error, search } = useMovieSearch(apiKey)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  const handleAdd = (movie: Movie) => {
    const tierMovie: TierMovie = {
      ...movie,
      instanceId: `${movie.id}-${Date.now()}`,
    }
    onAddMovie(tierMovie)
  }

  return (
    <div className="movie-search">
      <div className="search-header">
        <h2>Add Movies</h2>
        <button className="link-btn" onClick={onChangeApiKey}>Change API Key</button>
      </div>
      <input
        type="text"
        placeholder="Search for a movie..."
        value={query}
        onChange={handleChange}
        className="search-input"
      />
      {error && <p className="search-error">{error}</p>}
      {loading && <p className="search-loading">Searching...</p>}
      <div className="search-results">
        {results.map(movie => (
          <div
            key={movie.id}
            className="search-result-item"
            onClick={() => handleAdd(movie)}
            title={`Add ${movie.title}`}
          >
            {movie.poster_path ? (
              <img
                src={`${POSTER_BASE}${movie.poster_path}`}
                alt={movie.title}
                className="result-poster"
              />
            ) : (
              <div className="result-poster no-poster-sm">
                <span>{movie.title[0]}</span>
              </div>
            )}
            <div className="result-info">
              <p className="result-title">{movie.title}</p>
              <p className="result-year">{movie.release_date?.slice(0, 4) ?? 'N/A'}</p>
            </div>
            <button className="add-btn">+</button>
          </div>
        ))}
      </div>
    </div>
  )
}
