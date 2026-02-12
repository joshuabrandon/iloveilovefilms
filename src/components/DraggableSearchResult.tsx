import { useDraggable } from '@dnd-kit/core'
import type { Movie } from '../types'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

interface Props {
  movie: Movie
  isSelected: boolean
  genreMap: Map<number, string>
  runtime: number | null | undefined
  onSelect: (movie: Movie, pos: { x: number; y: number }) => void
}

export function DraggableSearchResult({ movie, isSelected, genreMap, runtime, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `search-${movie.id}`,
    data: { type: 'search-result', movie },
  })

  const genres = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map(id => genreMap.get(id))
    .filter(Boolean)
    .join(' · ')

  const runtimeStr = runtime != null && runtime > 0
    ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
    : runtime === 0 ? 'N/A' : ''

  return (
    <div
      ref={setNodeRef}
      className={`search-result-item draggable ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      title={isSelected ? `Click a tier to place ${movie.title}` : `Click to select or drag ${movie.title} to a tier`}
      onClick={(e) => onSelect(movie, { x: e.clientX, y: e.clientY })}
      {...attributes}
      {...listeners}
    >
      {movie.poster_path ? (
        <img
          src={`${POSTER_BASE}${movie.poster_path}`}
          alt={movie.title}
          className="result-poster"
          draggable={false}
          crossOrigin="anonymous"
        />
      ) : (
        <div className="result-poster no-poster-sm">
          <span>{movie.title[0]}</span>
        </div>
      )}
      <div className="result-info">
        <p className="result-title">{movie.title}</p>
        <p className="result-year">{movie.release_date?.slice(0, 4) ?? 'N/A'}</p>
        <div className="result-extra">
          {movie.vote_average > 0 && (
            <span className="result-rating">★ {movie.vote_average.toFixed(1)}</span>
          )}
          {genres && <span className="result-genres">{genres}</span>}
          {runtimeStr && <span className="result-runtime">{runtimeStr}</span>}
        </div>
      </div>
    </div>
  )
}
