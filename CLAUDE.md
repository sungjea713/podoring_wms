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

#### Step 3 & 4: Parallel Execution
- **Step 3**: Gemini Grounding for tasting notes (12-18s, 4-5 queries)
- **Step 4**: Google Image Search for 10 wine images (0.5-0.7s)
- **Pattern**: `Promise.all([step3(), step4()])` for performance

### Performance Metrics

Total time: ~60 seconds (13s + 0.7s + 43s + max(18s, 0.7s))
Total queries: ~13 (0 + 1 + 7 + 5 + 1)

## UI/UX Design System

### Color Palette
- **Brand Color**: `#A80569` (wine-600) - Primary brand color
- **Background**: `#EAE8E4` with gradient to `#DDD9D0` - Warm beige-gray
- **Card Background**: `#F4F2EF` - Light beige for main cards
- **Header/Nav/Footer**: `#F3F1EA` - Ivory tone
- **Inner Item Boxes**: `#E6E7EB` - Gray tone for nested elements (e.g., TOP 5 wines)

### Chart Colors (Wine-themed palette - Medium tone)
- **Red wine**: `#B05B6C` - Medium rose red
- **White wine**: `#D4B97A` - Golden champagne
- **Rosé wine**: `#E8B5B5` - Rose pink
- **Sparkling wine**: `#7A9FBF` - Medium sparkling blue
- **Dessert wine**: `#C89158` - Amber gold

### Icons
- Using **Lucide React** for all UI icons (modern, open-source, MIT license)
- Header logo: `src/frontend/img/podoring_wms_logo.png`
- Favicon: `src/frontend/img/podoring_icon.png`

### Dashboard Features
1. **Statistics Cards** - Total wines, total stock, low stock alerts with Lucide icons
2. **Shelf Status** - Visual progress bars for A/B/C shelves with color coding
3. **Top 5 Wines** - Stock ranking with wine images in styled boxes
4. **Wine Type Distribution** - Donut chart with drop shadow, thinner ring, gradient center text
5. **Country Distribution** - Horizontal bar chart with brand color gradient
6. **Date Timeline** - Line chart showing wine additions over last 7 days with area gradient fill

### Layout Structure
```
Dashboard
├── Stats Cards (3 columns)
├── Shelf Status (full width)
├── Grid Row 1 (2 columns)
│   ├── Top 5 Wines
│   └── Wine Type Distribution (Donut)
└── Grid Row 2 (2 columns)
    ├── Country Distribution (Bars)
    └── Date Timeline (Line chart)
```

## Static File Serving

Images are served via custom fetch handler in `src/index.ts`:

```typescript
Bun.serve({
  async fetch(req) {
    const url = new URL(req.url)

    // Serve images from src/frontend/img/
    if (url.pathname.startsWith('/img/')) {
      const filePath = `./src/frontend${url.pathname}`
      const file = Bun.file(filePath)
      if (await file.exists()) {
        return new Response(file)
      }
      return new Response('Image not found', { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },

  routes: {
    "/": indexHtml,
    // ... API routes
  }
})
```

## Deployment

Deploy to Railway:
- Set environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_CSE_ID
- Railway auto-detects Bun and sets PORT
- Push to GitHub main branch triggers auto-deploy
