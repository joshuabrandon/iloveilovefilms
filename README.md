# Movie Tier List

A browser-based tool for ranking movies into tiers using The Movie Database (TMDB).

## Features

- Search for any movie using the TMDB API
- Drag-and-drop movies into tiers (S, A, B, C, D, F)
- Click-to-place mode as an alternative to dragging
- Export your tier list as a PNG image
- Tier list state persists via browser localStorage

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, TypeScript |
| Build | Vite |
| Drag & Drop | dnd-kit |
| HTTP | axios |
| Image Export | html-to-image |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

## Installation

```bash
git clone https://github.com/joshuabrandon/iloveilovefilms.git
cd rating_app
npm install
```

## TMDB API Key Setup

This app requires a TMDB API key to search for movies. You can get a free key at [themoviedb.org](https://www.themoviedb.org/settings/api).

**Option 1 — Environment variable (recommended):**

Create a `.env` file in the project root:

```
VITE_TMDB_API_KEY=your_api_key_here
```

**Option 2 — In-app settings:**

Leave `.env` unset and enter your key in the Settings modal when the app loads.

## Running the App

```bash
npm run dev
```

Then open `https://localhost:5173` in your browser. Accept the self-signed certificate warning (used for local HTTPS only).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Disclosure

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters, and metadata are provided by [The Movie Database](https://www.themoviedb.org/). All movie titles, images, and related content are the property of their respective owners.

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
