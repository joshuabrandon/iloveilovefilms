import { useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { MovieTile } from './MovieTile'
import type { Tier, TierMovie } from '../types'

const PREMIUM_TIERS = ['S', 'A', 'B']

interface Props {
  tier: Tier
  onRemove: (instanceId: string) => void
  hasSelection: boolean
  onTierClick?: (tierId: string) => void
  onTileSelect?: (movie: TierMovie, pos: { x: number; y: number }) => void
  selectedInstanceId?: string | null
}

export function TierRow({ tier, onRemove, hasSelection, onTierClick, onTileSelect, selectedInstanceId }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.id}` })
  const labelRef = useRef<HTMLDivElement>(null)
  const isPremium = PREMIUM_TIERS.includes(tier.id)

  const handleClick = () => {
    if (hasSelection && onTierClick) onTierClick(tier.id)
  }

  const handleLabelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = labelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%'
    const my = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%'
    el.style.setProperty('--mx', mx)
    el.style.setProperty('--my', my)
  }

  const labelStyle = isPremium
    ? {}
    : { backgroundColor: tier.color }

  return (
    <div
      ref={setNodeRef}
      className={`tier-row ${isOver ? 'drop-over' : ''} ${hasSelection ? 'selectable' : ''}`}
      onClick={handleClick}
    >
      <div
        ref={labelRef}
        className={`tier-label ${isPremium ? `tier-label-premium tier-label-${tier.id}` : `tier-label-matte tier-label-${tier.id}`}`}
        style={labelStyle}
        onMouseMove={isPremium ? handleLabelMouseMove : undefined}
      >
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
              onSelect={onTileSelect}
              isSelected={movie.instanceId === selectedInstanceId}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
