# Architecture

OmniBox AI is a serverless, client-side SPA.

- Build with React 19+, TypeScript strict mode, and Vite.
- Keep all features inside the browser sandbox. Do not add API routes, backend services, server actions, or Node runtime dependencies.
- Use Zustand for global UI/settings state. Persist configuration fields to `localStorage` where appropriate.
- Use Dexie.js for IndexedDB data such as history, documents, transactions, and larger structured records.
- Prefer feature folders under `src/features/` and shared layout/components under `src/components/`.
- Keep provider IDs stable unless a migration is explicitly planned.
