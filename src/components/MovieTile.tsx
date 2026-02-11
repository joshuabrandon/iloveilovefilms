import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TierMovie } from '../types'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

interface Props {
  movie: TierMovie
  onRemove?: (instanceId: string) => void
}

export function MovieTile({ movie, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: movie.instanceId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const posterUrl = movie.poster_path
    ? `${POSTER_BASE}${movie.poster_path}`
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`movie-tile ${isDragging ? 'dragging' : ''}`}
      title={`${movie.title} (${movie.release_date?.slice(0, 4) ?? '?'})`}
      {...attributes}
      {...listeners}
    >
      {posterUrl ? (
        <img src={posterUrl} alt={movie.title} draggable={false} crossOrigin="anonymous" />
      ) : (
        <div className="no-poster">
          <span>{movie.title}</span>
        </div>
      )}
      {onRemove && (
        <button
          className="remove-btn"
          onClick={e => { e.stopPropagation(); onRemove(movie.instanceId) }}
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  )
}
