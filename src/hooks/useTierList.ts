import { useState, useEffect } from 'react'
import type { Tier, TierListState, TierMovie } from '../types'

const STORAGE_KEY = 'movie-tier-list'

const DEFAULT_TIERS: Tier[] = [
  { id: 'S', label: 'S', color: '#ff7f7f', movies: [] },
  { id: 'A', label: 'A', color: '#ffbf7f', movies: [] },
  { id: 'B', label: 'B', color: '#ffff7f', movies: [] },
  { id: 'C', label: 'C', color: '#7fff7f', movies: [] },
  { id: 'D', label: 'D', color: '#7fbfff', movies: [] },
  { id: 'F', label: 'F', color: '#bf7fff', movies: [] },
]

function loadState(): TierListState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TierListState
  } catch {
    // ignore
  }
  return { tiers: DEFAULT_TIERS, unranked: [] }
}

function saveState(state: TierListState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useTierList() {
  const [state, setState] = useState<TierListState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const addToUnranked = (movie: TierMovie) => {
    setState(prev => {
      // prevent duplicate instanceIds
      const already =
        prev.unranked.some(m => m.instanceId === movie.instanceId) ||
        prev.tiers.some(t => t.movies.some(m => m.instanceId === movie.instanceId))
      if (already) return prev
      return { ...prev, unranked: [...prev.unranked, movie] }
    })
  }

  const moveMovie = (
    movieInstanceId: string,
    targetTierId: string, // 'unranked' or a tier id
    targetIndex: number,
  ) => {
    setState(prev => {
      // Find and remove the movie from wherever it is
      let movie: TierMovie | undefined
      let newUnranked = prev.unranked.filter(m => {
        if (m.instanceId === movieInstanceId) { movie = m; return false }
        return true
      })
      const newTiers = prev.tiers.map(tier => ({
        ...tier,
        movies: tier.movies.filter(m => {
          if (m.instanceId === movieInstanceId) { movie = m; return false }
          return true
        }),
      }))

      if (!movie) return prev

      if (targetTierId === 'unranked') {
        newUnranked = [
          ...newUnranked.slice(0, targetIndex),
          movie,
          ...newUnranked.slice(targetIndex),
        ]
      } else {
        return {
          unranked: newUnranked,
          tiers: newTiers.map(tier => {
            if (tier.id !== targetTierId) return tier
            const movies = [...tier.movies]
            movies.splice(targetIndex, 0, movie!)
            return { ...tier, movies }
          }),
        }
      }

      return { unranked: newUnranked, tiers: newTiers }
    })
  }

  const removeMovie = (instanceId: string) => {
    setState(prev => ({
      unranked: prev.unranked.filter(m => m.instanceId !== instanceId),
      tiers: prev.tiers.map(t => ({
        ...t,
        movies: t.movies.filter(m => m.instanceId !== instanceId),
      })),
    }))
  }

  const resetTiers = () => {
    setState({ tiers: DEFAULT_TIERS.map(t => ({ ...t, movies: [] })), unranked: [] })
  }

  return { state, addToUnranked, moveMovie, removeMovie, resetTiers }
}
