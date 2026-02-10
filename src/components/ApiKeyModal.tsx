import { useState } from 'react'

interface Props {
  onSubmit: (key: string) => void
}

export function ApiKeyModal({ onSubmit }: Props) {
  const [value, setValue] = useState('')

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>TMDB API Key Required</h2>
        <p>
          This app uses The Movie Database (TMDB) to search for movies and fetch
          poster art. You need a free API key to continue.
        </p>
        <ol>
          <li>
            Create a free account at{' '}
            <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">
              themoviedb.org
            </a>
          </li>
          <li>Go to Settings → API and request a key (choose "Developer")</li>
          <li>Copy your <strong>API Key (v3 auth)</strong> and paste it below</li>
        </ol>
        <input
          type="text"
          placeholder="Paste your TMDB API key here"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value.trim() && onSubmit(value.trim())}
          autoFocus
        />
        <button
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  )
}
