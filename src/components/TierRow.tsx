import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { MovieTile } from './MovieTile'
import type { Tier } from '../types'

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

interface Props {
  tier: Tier
  onRemove: (instanceId: string) => void
  hasSelection: boolean
  onTierClick?: (tierId: string) => void
}

export function TierRow({ tier, onRemove, hasSelection, onTierClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.id}` })

  const handleClick = () => {
    if (hasSelection && onTierClick) onTierClick(tier.id)
  }

  return (
    <div
      ref={setNodeRef}
      className={`tier-row ${isOver ? 'drop-over' : ''} ${hasSelection ? 'selectable' : ''}`}
      onClick={handleClick}
    >
      <div className="tier-label" style={{ backgroundColor: tier.color, color: isDark(tier.color) ? '#fff' : '#000' }}>
        {tier.label}
      </div>
      <SortableContext
        items={tier.movies.map(m => m.instanceId)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="tier-movies">
          {tier.movies.map(movie => (
            <MovieTile
              key={movie.instanceId}
              movie={movie}
              onRemove={onRemove}
            />
          ))}
          {tier.movies.length === 0 && (
            <div className="tier-empty">{hasSelection ? 'Click to place here' : 'Drop movies here'}</div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
