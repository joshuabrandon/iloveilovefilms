import { forwardRef } from 'react'
import { TierRow } from './TierRow'
import type { TierListState } from '../types'

interface Props {
  state: TierListState
  onRemove: (instanceId: string) => void
  hasSelection: boolean
  onTierClick?: (tierId: string) => void
  onTileSelect?: (movie: import('../types').TierMovie, pos: { x: number; y: number }) => void
  selectedInstanceId?: string | null
}

export const TierList = forwardRef<HTMLDivElement, Props>(
  function TierList({ state, onRemove, hasSelection, onTierClick, onTileSelect, selectedInstanceId }, ref) {
    return (
      <div ref={ref} className="tier-list-wrapper">
        <div className="tier-rows">
          {state.tiers.map(tier => (
            <TierRow
              key={tier.id}
              tier={tier}
              onRemove={onRemove}
              hasSelection={hasSelection}
              onTierClick={onTierClick}
              onTileSelect={onTileSelect}
              selectedInstanceId={selectedInstanceId}
            />
          ))}
        </div>
      </div>
    )
  }
)
