import { useState, useEffect } from 'react'
import type { Tier, TierListState, TierMovie } from '../types'

const STORAGE_KEY = 'movie-tier-list'

const DEFAULT_TIERS: Tier[] = [
  { id: 'S', label: 'S', color: '#FFD700', movies: [] },
  { id: 'A', label: 'A', color: '#C0C0C0', movies: [] },
  { id: 'B', label: 'B', color: '#CD7F32', movies: [] },
  { id: 'C', label: 'C', color: '#666666', movies: [] },
  { id: 'D', label: 'D', color: '#494949', movies: [] },
  { id: 'F', label: 'F', color: '#2C2C2C', movies: [] },
]

function loadState(): TierListState {
  return { tiers: DEFAULT_TIERS }
}

function saveState(state: TierListState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useTierList() {
  const [state, setState] = useState<TierListState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const clearOnClose = () => localStorage.removeItem(STORAGE_KEY)
    window.addEventListener('beforeunload', clearOnClose)
    return () => window.removeEventListener('beforeunload', clearOnClose)
  }, [])

  const addToTier = (movie: TierMovie, tierId: string, index: number) => {
    setState(prev => ({
      tiers: prev.tiers.map(tier => {
        if (tier.id !== tierId) return tier
        const movies = [...tier.movies]
        movies.splice(index, 0, movie)
        return { ...tier, movies }
      }),
    }))
  }

  const moveMovie = (
    movieInstanceId: string,
    targetTierId: string,
    targetIndex: number,
  ) => {
    setState(prev => {
      let movie: TierMovie | undefined
      const newTiers = prev.tiers.map(tier => ({
        ...tier,
        movies: tier.movies.filter(m => {
          if (m.instanceId === movieInstanceId) { movie = m; return false }
          return true
        }),
      }))

      if (!movie) return prev

      return {
        tiers: newTiers.map(tier => {
          if (tier.id !== targetTierId) return tier
          const movies = [...tier.movies]
          movies.splice(targetIndex, 0, movie!)
          return { ...tier, movies }
        }),
      }
    })
  }

  const removeMovie = (instanceId: string) => {
    setState(prev => ({
      tiers: prev.tiers.map(t => ({
        ...t,
        movies: t.movies.filter(m => m.instanceId !== instanceId),
      })),
    }))
  }

  const resetTiers = () => {
    setState({ tiers: DEFAULT_TIERS.map(t => ({ ...t, movies: [] })) })
  }

  return { state, addToTier, moveMovie, removeMovie, resetTiers }
}
