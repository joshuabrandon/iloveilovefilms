import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import { TierRow } from './TierRow'
import { MovieTile } from './MovieTile'
import type { TierListState, TierMovie } from '../types'
import { useDroppable } from '@dnd-kit/core'

interface Props {
  state: TierListState
  onMove: (instanceId: string, targetTierId: string, targetIndex: number) => void
  onRemove: (instanceId: string) => void
  onReset: () => void
}

function UnrankedZone({
  movies,
  onRemove,
}: {
  movies: TierMovie[]
  onRemove: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tier-unranked' })
  return (
    <div className={`unranked-zone ${isOver ? 'drop-over' : ''}`}>
      <div className="unranked-label">Unranked</div>
      <SortableContext
        items={movies.map(m => m.instanceId)}
        strategy={horizontalListSortingStrategy}
      >
        <div ref={setNodeRef} className="unranked-movies">
          {movies.map(movie => (
            <MovieTile key={movie.instanceId} movie={movie} onRemove={onRemove} />
          ))}
          {movies.length === 0 && (
            <div className="unranked-empty">
              Search for movies on the left and click to add them here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export function TierList({ state, onMove, onRemove, onReset }: Props) {
  const [activeMovie, setActiveMovie] = useState<TierMovie | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // Find which container holds a given instanceId
  function findContainer(instanceId: string): string {
    if (state.unranked.some(m => m.instanceId === instanceId)) return 'unranked'
    for (const tier of state.tiers) {
      if (tier.movies.some(m => m.instanceId === instanceId)) return tier.id
    }
    return 'unranked'
  }

  function getMoviesInContainer(containerId: string): TierMovie[] {
    if (containerId === 'unranked') return state.unranked
    return state.tiers.find(t => t.id === containerId)?.movies ?? []
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const container = findContainer(id)
    const movies = getMoviesInContainer(container)
    setActiveMovie(movies.find(m => m.instanceId === id) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // over a container directly (droppable zone)
    const overContainerId = overId.startsWith('tier-')
      ? overId.replace('tier-', '')
      : findContainer(overId)

    const activeContainerId = findContainer(activeId)
    if (activeContainerId === overContainerId) return

    // Moving to new container — place at end
    const targetMovies = getMoviesInContainer(overContainerId)
    onMove(activeId, overContainerId, targetMovies.length)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveMovie(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const overContainerId = overId.startsWith('tier-')
      ? overId.replace('tier-', '')
      : findContainer(overId)

    const activeContainerId = findContainer(activeId)

    if (activeContainerId === overContainerId) {
      // Reorder within same container
      const movies = getMoviesInContainer(activeContainerId)
      const oldIndex = movies.findIndex(m => m.instanceId === activeId)
      const newIndex = movies.findIndex(m => m.instanceId === overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onMove(activeId, activeContainerId, newIndex)
      }
    } else {
      const targetMovies = getMoviesInContainer(overContainerId)
      const overIndex = targetMovies.findIndex(m => m.instanceId === overId)
      onMove(activeId, overContainerId, overIndex >= 0 ? overIndex : targetMovies.length)
    }
  }

  // Flatten all item ids for dnd context
  const allIds = [
    ...state.unranked.map(m => m.instanceId),
    ...state.tiers.flatMap(t => t.movies.map(m => m.instanceId)),
  ]

  return (
    <div className="tier-list-wrapper">
      <div className="tier-list-header">
        <h2>Tier List</h2>
        <button className="danger-btn" onClick={onReset}>Reset All</button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allIds} strategy={horizontalListSortingStrategy}>
          <div className="tier-rows">
            {state.tiers.map(tier => (
              <TierRow key={tier.id} tier={tier} onRemove={onRemove} />
            ))}
          </div>
          <UnrankedZone movies={state.unranked} onRemove={onRemove} />
        </SortableContext>

        <DragOverlay>
          {activeMovie && (
            <MovieTile movie={activeMovie} compact />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
