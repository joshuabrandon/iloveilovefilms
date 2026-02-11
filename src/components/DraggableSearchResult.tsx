import { useDraggable } from '@dnd-kit/core'
import type { Movie } from '../types'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

interface Props {
  movie: Movie
  isSelected: boolean
  onSelect: (movie: Movie) => void
}

export function DraggableSearchResult({ movie, isSelected, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `search-${movie.id}`,
    data: { type: 'search-result', movie },
  })

  return (
    <div
      ref={setNodeRef}
      className={`search-result-item draggable ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      title={isSelected ? `Click a tier to place ${movie.title}` : `Click to select or drag ${movie.title} to a tier`}
      onClick={() => onSelect(movie)}
      {...attributes}
      {...listeners}
    >
      {movie.poster_path ? (
        <img
          src={`${POSTER_BASE}${movie.poster_path}`}
          alt={movie.title}
          className="result-poster"
          draggable={false}
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
    </div>
  )
}
