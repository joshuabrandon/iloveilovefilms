import { forwardRef } from 'react'
import { TierRow } from './TierRow'
import type { TierListState } from '../types'

interface Props {
  state: TierListState
  onRemove: (instanceId: string) => void
  onReset: () => void
  title: string
  hasSelection: boolean
  onTierClick?: (tierId: string) => void
}

export const TierList = forwardRef<HTMLDivElement, Props>(
  function TierList({ state, onRemove, onReset, title, hasSelection, onTierClick }, ref) {
    return (
      <div className="tier-list-wrapper">
        <div className="tier-list-header">
          <h2>{title}</h2>
          <button className="danger-btn" onClick={onReset}>Reset All</button>
        </div>
        <div ref={ref} className="tier-rows">
          {state.tiers.map(tier => (
            <TierRow
              key={tier.id}
              tier={tier}
              onRemove={onRemove}
              hasSelection={hasSelection}
              onTierClick={onTierClick}
            />
          ))}
        </div>
      </div>
    )
  }
)
