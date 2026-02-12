import type { TierMovie } from '../types'

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

interface Props {
  movie: TierMovie
}

export function DragOverlayTile({ movie }: Props) {
  const posterUrl = movie.poster_path
    ? `${POSTER_BASE}${movie.poster_path}`
    : null

  return (
    <div className="movie-tile" style={{ opacity: 0.85, cursor: 'grabbing', width: 80, height: 120 }}>
      {posterUrl ? (
        <img src={posterUrl} alt={movie.title} draggable={false} crossOrigin="anonymous"
          style={{ width: 80, height: 120, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div className="no-poster">
          <span>{movie.title}</span>
        </div>
      )}
    </div>
  )
}
