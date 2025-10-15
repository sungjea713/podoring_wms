# Podoring WMS Development Guidelines

Default to using Bun instead of Node.js.

## Commands

- `bun install` - Install dependencies
- `bun run dev` - Development server with hot reload
- `bun run start` - Production server
- `bun run seed` - Migrate Google Sheets data to Supabase
- `bun test-photo-to-wine.ts` - Test AI auto-generation (Pre-Step → Step 1-4)

## Bun-specific APIs

- Use `Bun.serve()` for HTTP server (supports WebSockets, routes)
- Use `@supabase/supabase-js` for PostgreSQL (via Supabase)
- Use `Bun.file()` instead of `node:fs` for file operations
- WebSocket is built-in, don't use `ws` package
- Bun automatically loads .env.local, don't use `dotenv`
- Use `FormData` for multipart file uploads (built-in Web API)
- Use `Promise.all()` for parallel execution (Step 3 & 4)

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

## AI Auto-Generation System

### 4-Stage Pipeline

The system automatically extracts wine information from photos using a 4-stage pipeline:

```
Photo → Pre-Step → Step 1 → Step 2 → (Step 3 & 4 parallel) → Complete Wine Data
```

### Implementation Details

#### Pre-Step: Image Analysis
- **API**: Gemini 2.5-flash with image input
- **Input**: Wine label photo (Base64 encoded)
- **Output**: `{ searchQuery, winery }`
- **Time**: 13-17 seconds
- **File**: `src/api/gemini.ts:preStep_extractFromImage()`

```typescript
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    ]
  }]
})
```

#### Step 1: Vivino URL Search
- **API**: Google Custom Search API
- **Input**: `searchQuery + "vivino"`
- **Output**: `vivino_url`
- **Time**: 0.5-0.7 seconds
- **File**: `src/api/google-search.ts:searchVivinoUrl()`

#### Step 2: Basic Wine Info Extraction
- **API**: Gemini 2.5-flash with Grounding
- **Query Strategy**: 7 queries (optimized from 40)
  1. title (1 query)
  2. winery (1 query)
  3. variety - with Blend detection (1 query)
  4. price (1 query)
  5. abv (1 query)
  6. points (1 query)
  7. country, province, region_1, region_2 combined (1 query)
- **Time**: 27-43 seconds
- **File**: `src/api/gemini.ts:step2_extractFromVivino()`

**Critical**: Use explicit query count in prompt to control Grounding queries:

```typescript
const prompt = `검색 전략 (총 7개 쿼리 사용):
1. title 검색 (1개 쿼리)
2. winery 검색 (1개 쿼리)
...`
```

#### Step 3 & 4: Parallel Execution
- **Step 3**: Gemini Grounding for tasting notes (12-18s, 4-5 queries)
- **Step 4**: Google Image Search for 10 wine images (0.5-0.7s)
- **Pattern**: `Promise.all([step3(), step4()])` for performance

```typescript
const [step3Result, step4Result] = await Promise.all([
  fetch('/api/wines/auto-generate/step3', { ... }),
  fetch('/api/wines/auto-generate/step4', { ... })
])
```

### Query Optimization Best Practices

1. **Explicit Query Count**: Always specify exact number of queries in prompt
2. **Group Related Fields**: Combine related data (e.g., all regions) in one query
3. **Avoid Image Search in Grounding**: Use dedicated Google Image Search API instead
4. **Parallel Independent Tasks**: Run Step 3 & 4 simultaneously

### Performance Metrics

Total time: ~60 seconds (13s + 0.7s + 43s + max(18s, 0.7s))
Total queries: ~13 (0 + 1 + 7 + 5 + 1)

## Deployment

Deploy to Railway:
- Set environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_CSE_ID
- Railway auto-detects Bun and sets PORT
- Push to GitHub main branch triggers auto-deploy
