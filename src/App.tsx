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

  // ── Layout constants ───────────────────────────────────────────────────
  const TILE_W        = 80
  const TILE_H        = 120
  const TILE_GAP      = 4
  const MOVIES_PAD    = 6     // padding inside .tier-movies (all sides)
  const LABEL_W       = 60
  const TIER_GAP      = 4     // gap between rows in .tier-rows
  const BORDER        = 2
  const CONTENT_PAD   = 40    // each side, from .app-content { padding: 16px 40px }
  const SIDEBAR_W     = 393   // .app-sidebar width + 1px border
  const MARGIN        = 10
  const HEADER_H      = 48
  const PIXEL_RATIO   = 2

  const BG_COLOR      = '#d6cdae'

  const SURFACE_COLOR = '#1e1e1e'
  const LABEL_TXT     = '#ffffff'
  const NO_POSTER_BG  = '#2a2a2a'
  const NO_POSTER_TXT = '#e8e8e8'
  const POSTER_BASE   = 'https://image.tmdb.org/t/p/w185'

  // Compute snapped layout: tier list width that fits exactly N whole tiles
  const computeSnappedLayout = (windowWidth: number) => {
    const available = windowWidth - SIDEBAR_W - 2 * CONTENT_PAD
    const n = Math.max(1, Math.floor(
      (available - LABEL_W - MOVIES_PAD * 2 - BORDER * 2 + TILE_GAP) / (TILE_W + TILE_GAP)
    ))
    const width = LABEL_W + TILE_W * n + TILE_GAP * (n - 1) + MOVIES_PAD * 2 + BORDER * 2
    return { tilesPerRow: n, tierListWidth: width }
  }

  const [layout, setLayout] = useState(() => computeSnappedLayout(window.innerWidth))

  useEffect(() => {
    const onResize = () => setLayout(computeSnappedLayout(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleSaveImage = useCallback(async () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '')}_${stamp}.png`

  // Fixed 10-tile-per-row layout for saved image
  const SAVE_TILES_PER_ROW = 10
  const SAVE_TIER_LIST_W   = LABEL_W + TILE_W * SAVE_TILES_PER_ROW + TILE_GAP * (SAVE_TILES_PER_ROW - 1) + MOVIES_PAD * 2 + BORDER * 2  // 912
  const saveRowH = (n: number) => n === 0 ? 140 : Math.max(140, 12 + 124 * Math.ceil(n / SAVE_TILES_PER_ROW))

  const tierListH = state.tiers.reduce((sum, tier, i) =>
    sum + saveRowH(tier.movies.length) + (i < state.tiers.length - 1 ? TIER_GAP : 0), 0)

  // Pre-load all poster images in parallel
  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload  = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })

  const allMovies = state.tiers.flatMap(t => t.movies)
  const loaded    = await Promise.all(
    allMovies.map(m => m.poster_path ? loadImg(`${POSTER_BASE}${m.poster_path}`) : Promise.resolve(null))
  )
  const posterMap = new Map<string, HTMLImageElement | null>()
  allMovies.forEach((m, i) => posterMap.set(m.instanceId, loaded[i]))

  // Create canvas
  const imageWidth  = MARGIN + SAVE_TIER_LIST_W + MARGIN
  const imageHeight = HEADER_H + MARGIN + tierListH + MARGIN

  const canvas  = document.createElement('canvas')
  canvas.width  = imageWidth  * PIXEL_RATIO
  canvas.height = imageHeight * PIXEL_RATIO

  const ctx = canvas.getContext('2d')!
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO)

  // Beige background
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, imageWidth, imageHeight)

  // Dark header band (matches app-header: var(--surface))
  ctx.fillStyle = SURFACE_COLOR
  ctx.fillRect(0, 0, imageWidth, HEADER_H)

  // Title centred between image top and tier list top
  ctx.fillStyle     = NO_POSTER_TXT
  ctx.font          = '700 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'
  ctx.letterSpacing = '0.5px'
  ctx.fillText(title, imageWidth / 2, (HEADER_H + MARGIN) / 2)

  // Draw tier rows
  let y = HEADER_H + MARGIN
  for (const tier of state.tiers) {
    const rh = saveRowH(tier.movies.length)
    const rx = MARGIN

    // Row surface background
    ctx.fillStyle = SURFACE_COLOR
    ctx.fillRect(rx, y, SAVE_TIER_LIST_W, rh)

    // Label coloured background
    ctx.fillStyle = tier.color
    ctx.fillRect(rx, y, LABEL_W, rh)

    // Label text
    ctx.fillStyle    = LABEL_TXT
    ctx.font         = '700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(tier.label, rx + LABEL_W / 2, y + rh / 2)

    // Movie tiles
    for (let i = 0; i < tier.movies.length; i++) {
      const movie = tier.movies[i]
      const col   = i % SAVE_TILES_PER_ROW
      const row   = Math.floor(i / SAVE_TILES_PER_ROW)
      const tx    = rx + LABEL_W + MOVIES_PAD + col * (TILE_W + TILE_GAP)
      const ty    = y  + MOVIES_PAD           + row * (TILE_H + TILE_GAP)

      const img = posterMap.get(movie.instanceId)
      if (img) {
        ctx.drawImage(img, tx, ty, TILE_W, TILE_H)
      } else {
        ctx.fillStyle    = NO_POSTER_BG
        ctx.fillRect(tx, ty, TILE_W, TILE_H)
        ctx.fillStyle    = NO_POSTER_TXT
        ctx.font         = '11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(movie.title, tx + TILE_W / 2, ty + TILE_H / 2, TILE_W - 8)
      }
    }

    y += rh + TIER_GAP
  }

  // Download
  const dataUrl = canvas.toDataURL('image/png')
  const link    = document.createElement('a')
  link.download = filename
  link.href     = dataUrl
  link.click()
}, [title, state])

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
              style={{ width: layout.tierListWidth }}
            />
            <p className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
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
