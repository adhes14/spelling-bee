# Repository Context

**Project:** Spelling Bee Kids (Vue 3 SPA + PWA)

## Tech Stack
- **Framework:** Vue 3.5.13 (Composition API with `<script setup>`)
- **Build:** Vite 6.0.7
- **State:** Pinia 2.3.0
- **Routing:** Vue Router 4.5.0
- **Database:** Dexie 4.4.3 (IndexedDB wrapper)
- **PWA:** vite-plugin-pwa + Workbox 7.4.1
- **Package Manager:** pnpm

## Architecture
Component-based SPA with clear separation:
- `src/components/` — game, parents, ui subdirectories
- `src/views/` — page-level components
- `src/stores/` — Pinia stores
- `src/composables/` — reusable composition functions
- `src/utils/` — pure utility functions
- `src/db/` — Dexie database setup
- `src/router/` — Vue Router config
- `src/data/` — static data

Alias: `@` → `src/`

## Build Commands
- `pnpm run dev` — development server (port 3000)
- `pnpm run build` — production build
- `pnpm run preview` — preview built output

## Testing
No test runner detected. Strict TDD not available.

## Code Style
- No ESLint / Prettier configured
- No CI/CD pipelines found
- Vue 3 Composition API throughout