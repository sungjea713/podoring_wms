# Podoring WMS Development Guidelines

Default to using Bun instead of Node.js.

## Commands

- `bun install` - Install dependencies
- `bun run dev` - Development server with hot reload
- `bun run start` - Production server
- `bun run seed` - Migrate Google Sheets data to Supabase

## Bun-specific APIs

- Use `Bun.serve()` for HTTP server (supports WebSockets, routes)
- Use `@supabase/supabase-js` for PostgreSQL (via Supabase)
- Use `Bun.file()` instead of `node:fs` for file operations
- WebSocket is built-in, don't use `ws` package
- Bun automatically loads .env.local, don't use `dotenv`

## Frontend

Use HTML imports with `Bun.serve()`. HTML files can import .tsx/.jsx files directly:

```html
<script type="module" src="./app.tsx"></script>
```

Bun's bundler will transpile & bundle automatically. Use Tailwind CSS via CDN for simplicity.

## Development

```bash
bun --hot src/index.ts  # Hot Module Reload
```

## Testing

Use `bun test` for tests:

```typescript
import { test, expect } from "bun:test"

test("example", () => {
  expect(1).toBe(1)
})
```

## Deployment

Deploy to Railway:
- Set environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY
- Railway auto-detects Bun and sets PORT
- Push to GitHub main branch triggers auto-deploy
