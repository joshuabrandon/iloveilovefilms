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
} from '@dnd-kit/core'
import { toPng } from 'html-to-image'
import { ApiKeyModal } from './components/ApiKeyModal'
import { MovieSearch } from './components/MovieSearch'
import { TierList } from './components/TierList'
import { DragOverlayTile } from './components/DragOverlayTile'
import { EditableTitle } from './components/EditableTitle'
import { useTierList } from './hooks/useTierList'
import { useResizable } from './hooks/useResizable'
import type { Movie, TierMovie } from './types'

const API_KEY_STORAGE = 'tmdb-api-key'

function getStoredApiKey(): string {
  return import.meta.env.VITE_TMDB_API_KEY ?? localStorage.getItem(API_KEY_STORAGE) ?? ''
}

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  if (within.length > 0) return within
  return closestCorners(args)
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey)
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMovie, setActiveMovie] = useState<TierMovie | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [title, setTitle] = useState(() => localStorage.getItem('tier-list-title') || 'Movie Tier List')
  const { state, addToTier, moveMovie, removeMovie, resetTiers } = useTierList()
  const { width: sidebarWidth, onMouseDown: onResizeStart } = useResizable({
    minWidth: 200,
    maxWidth: 500,
    defaultWidth: 280,
    storageKey: 'sidebar-width',
  })
  const tierListRef = useRef<HTMLDivElement>(null)

  const usedMovieIds = useMemo(() => {
    const ids = new Set<number>()
    for (const tier of state.tiers) {
      for (const m of tier.movies) ids.add(m.id)
    }
    return ids
  }, [state])

  const handleSelectMovie = useCallback((movie: Movie) => {
    setSelectedMovie(prev => prev?.id === movie.id ? null : movie)
  }, [])

  const handleTierClick = useCallback((tierId: string) => {
    if (!selectedMovie) return
    const tierMovie: TierMovie = {
      ...selectedMovie,
      instanceId: `${selectedMovie.id}-${Date.now()}`,
    }
    const targetMovies = state.tiers.find(t => t.id === tierId)?.movies ?? []
    addToTier(tierMovie, tierId, targetMovies.length)
    setSelectedMovie(null)
  }, [selectedMovie, state.tiers, addToTier])

  useEffect(() => {
    localStorage.setItem('tier-list-title', title)
  }, [title])

  const handleSaveImage = useCallback(async () => {
    const node = tierListRef.current
    if (!node) return
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: '#111',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`
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

  // --- DnD handlers ---

  function handleDragStart(event: DragStartEvent) {
    setSelectedMovie(null)
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
    // Search items don't need dragOver — they aren't in any container yet
    if (activeId.startsWith('search-')) return

    const overId = String(over.id)
    const overContainerId = resolveTierId(overId)
    const activeContainerId = findContainer(activeId)

    if (!overContainerId || !activeContainerId || activeContainerId === overContainerId) return

    // Moving to new container — place at end
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
      // Dropping a search result onto a tier
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

    // Existing tier movie drag
    const overContainerId = resolveTierId(overId)
    const activeContainerId = findContainer(activeId)

    if (!overContainerId || !activeContainerId) return

    if (activeContainerId === overContainerId) {
      // Reorder within same container
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

  return (
    <div className="app">
      <header className="app-header">
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
          <aside
            className={`app-sidebar ${sidebarOpen ? '' : 'collapsed'}`}
            style={sidebarOpen ? { width: sidebarWidth } : undefined}
          >
            {sidebarOpen && (
              <MovieSearch
                apiKey={apiKey}
                usedMovieIds={usedMovieIds}
                selectedMovieId={selectedMovie?.id ?? null}
                onSelectMovie={handleSelectMovie}
              />
            )}
            {sidebarOpen && <div className="resize-handle" onMouseDown={onResizeStart} />}
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </aside>
          <section className="app-content">
            <TierList
              ref={tierListRef}
              state={state}
              onRemove={removeMovie}
              onReset={resetTiers}
              title={title}
              hasSelection={selectedMovie !== null}
              onTierClick={handleTierClick}
            />
          </section>
        </main>
        <DragOverlay>
          {activeMovie && <DragOverlayTile movie={activeMovie} />}
        </DragOverlay>
      </DndContext>
      {showKeyModal && <ApiKeyModal onSubmit={handleApiKey} onClose={() => setShowKeyModal(false)} />}
    </div>
  )
}
