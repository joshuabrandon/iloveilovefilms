import { useState } from 'react'
import { ApiKeyModal } from './components/ApiKeyModal'
import { MovieSearch } from './components/MovieSearch'
import { TierList } from './components/TierList'
import { useTierList } from './hooks/useTierList'
import type { TierMovie } from './types'

const API_KEY_STORAGE = 'tmdb-api-key'

function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey)
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey())
  const { state, addToUnranked, moveMovie, removeMovie, resetTiers } = useTierList()

  const handleApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key)
    setApiKey(key)
    setShowKeyModal(false)
  }

  const handleAddMovie = (movie: TierMovie) => {
    addToUnranked(movie)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Movie Tier List</h1>
      </header>
      <main className="app-main">
        {apiKey && (
          <aside className="app-sidebar">
            <MovieSearch
              apiKey={apiKey}
              onAddMovie={handleAddMovie}
              onChangeApiKey={() => setShowKeyModal(true)}
            />
          </aside>
        )}
        <section className="app-content">
          <TierList
            state={state}
            onMove={moveMovie}
            onRemove={removeMovie}
            onReset={resetTiers}
          />
        </section>
      </main>
      {showKeyModal && <ApiKeyModal onSubmit={handleApiKey} />}
    </div>
  )
}
