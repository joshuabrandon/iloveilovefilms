export interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview: string
  vote_average: number
}

export interface TierMovie extends Movie {
  instanceId: string // unique ID per tile so same movie can appear in multiple tiers
}

export interface Tier {
  id: string
  label: string
  color: string
  movies: TierMovie[]
}

export interface TierListState {
  tiers: Tier[]
}
