import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { MovieTile } from './MovieTile'
import type { Tier } from '../types'

interface Props {
  tier: Tier
  onRemove: (instanceId: string) => void
}

export function TierRow({ tier, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.id}` })

  return (
    <div className={`tier-row ${isOver ? 'drop-over' : ''}`}>
      <div className="tier-label" style={{ backgroundColor: tier.color }}>
        {tier.label}
      </div>
      <SortableContext
        items={tier.movies.map(m => m.instanceId)}
        strategy={horizontalListSortingStrategy}
      >
        <div ref={setNodeRef} className="tier-movies">
          {tier.movies.map(movie => (
            <MovieTile
              key={movie.instanceId}
              movie={movie}
              onRemove={onRemove}
              compact
            />
          ))}
          {tier.movies.length === 0 && (
            <div className="tier-empty">Drop movies here</div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
