import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCorners,
  type CollisionDetection,
  type Modifier,
} from '@dnd-kit/core'
import { toPng } from 'html-to-image'
import { ApiKeyModal } from './components/ApiKeyModal'
import { MovieSearch } from './components/MovieSearch'
import { TierList } from './components/TierList'
import { DragOverlayTile } from './components/DragOverlayTile'
import { EditableTitle } from './components/EditableTitle'
import { useTierList } from './hooks/useTierList'
import type { Movie, TierMovie } from './types'

const API_KEY_STORAGE = 'tmdb-api-key'

type PendingPlacement =
  | { source: 'search'; movie: Movie }
  | { source: 'tier'; movie: TierMovie }
  | null

function getStoredApiKey(): string {
  return import.meta.env.VITE_TMDB_API_KEY ?? localStorage.getItem(API_KEY_STORAGE) ?? ''
}

// Centers the DragOverlay tile on the cursor for search-result drags
const snapOverlayToCenter: Modifier = ({ activatorEvent, draggingNodeRect, overlayNodeRect, transform }) => {
  if (!activatorEvent || !draggingNodeRect || !overlayNodeRect) return transform
  const ax = (activatorEvent as PointerEvent).clientX
  const ay = (activatorEvent as PointerEvent).clientY
  return {
    ...transform,
    x: transform.x + ax - draggingNodeRect.left - overlayNodeRect.width / 2,
    y: transform.y + ay - draggingNodeRect.top - overlayNodeRect.height / 2,
  }
}

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  if (within.length > 0) return within
  return closestCorners(args)
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey)
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey())
  const [activeMovie, setActiveMovie] = useState<TierMovie | null>(null)
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [title, setTitle] = useState('Movie Tier List')
  const { state, addToTier, moveMovie, removeMovie, resetTiers } = useTierList()
  const tierListRef = useRef<HTMLDivElement>(null)

  // Track mouse for floating cursor preview
  useEffect(() => {
    if (!pendingPlacement) return
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [pendingPlacement])

  const handleSaveImage = useCallback(async () => {
    const node = tierListRef.current
    if (!node) return
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    const filename = `${title.replace(/[^a-zA-Z0-9 ]/g, '_')}_${stamp}.png`

    // Build a wrapper: title (header) on top, live tier list below.
    // Temporarily move the live node into the wrapper so html-to-image can
    // capture computed styles/images from the live DOM. Everything is
    // restored synchronously before the browser paints.
    const { width } = node.getBoundingClientRect()
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `width:${Math.round(width)}px;display:flex;flex-direction:column;gap:4px`
    const titleEl = document.createElement('div')
    titleEl.className = 'export-title'
    titleEl.textContent = title
    wrapper.appendChild(titleEl)

    node.before(wrapper)       // insert wrapper in .app-content before node
    wrapper.appendChild(node)  // move live node into wrapper (title above, tiers below)

    const promise = toPng(wrapper, { backgroundColor: '#d6cdae', pixelRatio: 2 })

    // Restore DOM synchronously — before any browser paint
    wrapper.before(node)  // move node back to its original position
    wrapper.remove()      // remove the now-empty wrapper

    try {
      const dataUrl = await promise
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to save image:', err)
    }
  }, [title])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key)
    setApiKey(key)
    setShowKeyModal(false)
  }

  // Computed values
  const usedMovieIds = useMemo(() => {
    const ids = new Set<number>()
    for (const tier of state.tiers) {
      for (const m of tier.movies) ids.add(m.id)
    }
    return ids
  }, [state])

  const pendingTierInstanceId = pendingPlacement?.source === 'tier'
    ? pendingPlacement.movie.instanceId
    : null

  // --- DnD helpers ---
  function findContainer(instanceId: string): string | null {
    for (const tier of state.tiers) {
      if (tier.movies.some(m => m.instanceId === instanceId)) return tier.id
    }
    return null
  }

  function getMoviesInContainer(containerId: string): TierMovie[] {
    return state.tiers.find(t => t.id === containerId)?.movies ?? []
  }

  function resolveTierId(overId: string): string | null {
    if (overId.startsWith('tier-')) return overId.replace('tier-', '')
    return findContainer(overId)
  }

  // --- Click-select handlers ---
  const handleSelectSearchMovie = useCallback((movie: Movie, pos: { x: number; y: number }) => {
    setMousePos(pos)
    setPendingPlacement(prev =>
      prev?.source === 'search' && prev.movie.id === movie.id
        ? null
        : { source: 'search', movie }
    )
  }, [])

  const handleSelectTileMovie = useCallback((movie: TierMovie, pos: { x: number; y: number }) => {
    setMousePos(pos)
    setPendingPlacement(prev =>
      prev?.source === 'tier' && prev.movie.instanceId === movie.instanceId
        ? null
        : { source: 'tier', movie }
    )
  }, [])

  const handleTierClick = useCallback((tierId: string) => {
    if (!pendingPlacement) return
    const targetMovies = state.tiers.find(t => t.id === tierId)?.movies ?? []

    if (pendingPlacement.source === 'search') {
      const tierMovie: TierMovie = {
        ...pendingPlacement.movie,
        instanceId: `${pendingPlacement.movie.id}-${Date.now()}`,
      }
      addToTier(tierMovie, tierId, targetMovies.length)
    } else {
      // Move tier movie to new tier
      moveMovie(pendingPlacement.movie.instanceId, tierId, targetMovies.length)
    }
    setPendingPlacement(null)
  }, [pendingPlacement, state.tiers, addToTier, moveMovie])

  // --- DnD handlers ---
  function handleDragStart(event: DragStartEvent) {
    setPendingPlacement(null)
    const id = String(event.active.id)

    if (id.startsWith('search-')) {
      const movie = event.active.data.current?.movie as Movie | undefined
      if (movie) {
        setActiveMovie({ ...movie, instanceId: `preview-${movie.id}` })
      }
    } else {
      const container = findContainer(id)
      if (container) {
        const movies = getMoviesInContainer(container)
        setActiveMovie(movies.find(m => m.instanceId === id) ?? null)
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    if (activeId.startsWith('search-')) return

    const overId = String(over.id)
    const overContainerId = resolveTierId(overId)
    const activeContainerId = findContainer(activeId)

    if (!overContainerId || !activeContainerId || activeContainerId === overContainerId) return

    const targetMovies = getMoviesInContainer(overContainerId)
    moveMovie(activeId, overContainerId, targetMovies.length)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveMovie(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith('search-')) {
      const movie = active.data.current?.movie as Movie | undefined
      if (!movie) return

      const targetTierId = resolveTierId(overId)
      if (!targetTierId) return

      const tierMovie: TierMovie = {
        ...movie,
        instanceId: `${movie.id}-${Date.now()}`,
      }
      const targetMovies = getMoviesInContainer(targetTierId)
      const overIndex = targetMovies.findIndex(m => m.instanceId === overId)
      addToTier(tierMovie, targetTierId, overIndex >= 0 ? overIndex : targetMovies.length)
      return
    }

    const overContainerId = resolveTierId(overId)
    const activeContainerId = findContainer(activeId)

    if (!overContainerId || !activeContainerId) return

    if (activeContainerId === overContainerId) {
      const movies = getMoviesInContainer(activeContainerId)
      const oldIndex = movies.findIndex(m => m.instanceId === activeId)
      const newIndex = movies.findIndex(m => m.instanceId === overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        moveMovie(activeId, activeContainerId, newIndex)
      }
    } else {
      const targetMovies = getMoviesInContainer(overContainerId)
      const overIndex = targetMovies.findIndex(m => m.instanceId === overId)
      moveMovie(activeId, overContainerId, overIndex >= 0 ? overIndex : targetMovies.length)
    }
  }

  const pendingSearchMovie = pendingPlacement?.source === 'search' ? pendingPlacement.movie : null
  const hasPending = pendingPlacement !== null

  // Build a TierMovie for the cursor follower from either source
  const cursorMovie: TierMovie | null = pendingPlacement
    ? pendingPlacement.source === 'search'
      ? { ...pendingPlacement.movie, instanceId: `pending-${pendingPlacement.movie.id}` }
      : pendingPlacement.movie
    : null

  return (
    <div className="app" onClick={() => { if (pendingPlacement) setPendingPlacement(null) }}>
      <header className="app-header" onClick={e => e.stopPropagation()}>
        <button className="header-btn-gold" onClick={resetTiers} title="Reset all tiers">
          Reset All
        </button>
        <EditableTitle value={title} onChange={setTitle} />
        <div className="header-actions">
          <button className="header-btn" onClick={handleSaveImage} title="Save tier list as image">
            Save Image
          </button>
          <button className="header-btn" onClick={() => setShowKeyModal(true)} title="Settings">
            Settings
          </button>
        </div>
      </header>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <main className="app-main">
          <aside className="app-sidebar">
            <MovieSearch
              apiKey={apiKey}
              usedMovieIds={usedMovieIds}
              selectedMovieId={pendingSearchMovie?.id ?? null}
              onSelectMovie={handleSelectSearchMovie}
            />
          </aside>
          <section className="app-content" onClick={e => e.stopPropagation()}>
            <TierList
              ref={tierListRef}
              state={state}
              onRemove={removeMovie}
              hasSelection={hasPending}
              onTierClick={handleTierClick}
              onTileSelect={handleSelectTileMovie}
              selectedInstanceId={pendingTierInstanceId}
            />
          </section>
        </main>
        <DragOverlay modifiers={[snapOverlayToCenter]}>
          {activeMovie && <DragOverlayTile movie={activeMovie} />}
        </DragOverlay>
      </DndContext>

      {/* Floating cursor follower when a movie is click-selected */}
      {cursorMovie && (
        <div
          className="cursor-follower"
          style={{ left: mousePos.x - 40, top: mousePos.y - 60 }}
        >
          <DragOverlayTile movie={cursorMovie} />
        </div>
      )}

      {showKeyModal && <ApiKeyModal onSubmit={handleApiKey} onClose={() => setShowKeyModal(false)} />}
    </div>
  )
}
