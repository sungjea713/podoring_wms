# 🍷 Podoring Kiosk - 완전 구현 가이드

> 이 문서는 Podoring WMS 데이터베이스를 활용한 **와인 키오스크 앱**을 처음부터 만들기 위한 완전한 가이드입니다.
>
> **새 프로젝트 폴더를 만들고 이 파일을 복사한 후, 단계별로 따라하면 키오스크 앱을 완성할 수 있습니다.**

---

## 📋 목차

1. [데이터베이스 구조 (필독!)](#1-데이터베이스-구조-필독)
2. [프로젝트 개요](#2-프로젝트-개요)
3. [기술 스택](#3-기술-스택)
4. [디렉토리 구조](#4-디렉토리-구조)
5. [환경 설정](#5-환경-설정)
6. [백엔드 구현](#6-백엔드-구현)
7. [프론트엔드 구현](#7-프론트엔드-구현)
8. [Railway 배포](#8-railway-배포)
9. [Phase 2 계획](#9-phase-2-계획)

---

## 1. 데이터베이스 구조 (필독!)

### 1.1 데이터베이스 개요

Podoring Kiosk는 **Podoring WMS와 동일한 Supabase PostgreSQL 데이터베이스를 공유**합니다.

```
Supabase Database (PostgreSQL)
└── Project: cglthkapppsmflmfkite
    ├── wines 테이블 (A-데이터베이스)
    ├── inventory 테이블 (B-데이터베이스)
    ├── inventory_details 뷰
    └── 트리거 (자동 재고 계산, 타임스탬프 업데이트)
```

**중요:**
- WMS: **CRUD** (Create, Read, Update, Delete) - 모든 권한
- Kiosk: **READ ONLY** (조회만) - 수정 불가

---

### 1.2 wines 테이블 (와인 정보)

**용도**: 모든 와인의 상세 정보를 저장

#### 스키마

```sql
CREATE TABLE wines (
  -- 기본 키
  id BIGSERIAL PRIMARY KEY,

  -- 와인 기본 정보
  title TEXT NOT NULL,                    -- 와인명 (필수)
  points DECIMAL(3,1),                    -- Vivino 평점 (1.0~5.0)
  vintage INTEGER,                        -- 빈티지 (생산 연도)
  type TEXT CHECK (type IN (              -- 와인 타입 (5가지만 허용)
    'Red wine',
    'White wine',
    'Rosé wine',
    'Sparkling wine',
    'Dessert wine'
  )),

  -- 품종 및 생산지
  variety TEXT,                           -- 포도 품종 (예: Cabernet Sauvignon)
  region_2 TEXT,                          -- 세세부 지역 (예: Pauillac)
  region_1 TEXT,                          -- 세부 지역 (예: Médoc)
  province TEXT,                          -- 주/도 (예: Bordeaux)
  country TEXT,                           -- 국가 (예: France)
  winery TEXT,                            -- 와이너리명

  -- 가격 및 알코올
  price INTEGER,                          -- 가격 (원화, 정수)
  abv DECIMAL(4,2),                       -- 알코올 도수 (예: 14.5)

  -- 설명 및 테이스팅 노트
  description TEXT,                       -- 와인 설명 (2-3문장)
  taste TEXT,                             -- 테이스팅 노트 (예: oak, cherry, vanilla)

  -- 특성 (1~5 척도)
  acidity INTEGER CHECK (acidity BETWEEN 1 AND 5),           -- 산도
  sweetness INTEGER CHECK (sweetness BETWEEN 1 AND 5),       -- 당도
  tannin INTEGER CHECK (tannin BETWEEN 1 AND 5),             -- 탄닌
  body INTEGER CHECK (body BETWEEN 1 AND 5),                 -- 바디감
  cost_effectiveness INTEGER CHECK (cost_effectiveness BETWEEN 1 AND 5), -- 가성비

  -- 이미지 및 URL
  image TEXT,                             -- 와인 이미지 URL
  vivino_url TEXT,                        -- Vivino 페이지 URL

  -- 재고 (자동 계산됨 - 트리거)
  stock INTEGER DEFAULT 0,                -- 총 재고 수량

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),   -- 생성 시각
  updated_at TIMESTAMPTZ DEFAULT NOW()    -- 수정 시각 (자동 업데이트)
);
```

#### 예시 데이터

```json
{
  "id": 1,
  "title": "Montes Alpha Cabernet Sauvignon",
  "points": 4.2,
  "vintage": 2021,
  "type": "Red wine",
  "variety": "Cabernet Sauvignon",
  "region_2": null,
  "region_1": "Colchagua Valley",
  "province": "Central Valley",
  "country": "Chile",
  "winery": "Montes",
  "price": 45000,
  "abv": 14.5,
  "description": "Rich and complex with firm tannins and a long finish.",
  "taste": "blackberry, oak, vanilla, dark chocolate",
  "acidity": 4,
  "sweetness": 1,
  "tannin": 4,
  "body": 4,
  "cost_effectiveness": 4,
  "image": "https://example.com/montes-alpha.jpg",
  "vivino_url": "https://www.vivino.com/montes-alpha-cabernet-sauvignon",
  "stock": 5,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

#### 인덱스 (성능 최적화)

```sql
-- 전문 검색 (Full-Text Search)
CREATE INDEX idx_wines_title ON wines USING GIN (to_tsvector('simple', title));

-- 필터링
CREATE INDEX idx_wines_type ON wines(type);
CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_variety ON wines(variety);
CREATE INDEX idx_wines_stock ON wines(stock);
```

**사용 예시:**
- 타입 필터: `SELECT * FROM wines WHERE type = 'Red wine'`
- 국가 필터: `SELECT * FROM wines WHERE country = 'Chile'`
- 검색: `SELECT * FROM wines WHERE title ILIKE '%Montes%'`

---

### 1.3 inventory 테이블 (재고 위치)

**용도**: 각 와인 병의 정확한 물리적 위치를 저장

#### 스키마

```sql
CREATE TABLE inventory (
  -- 기본 키
  id BIGSERIAL PRIMARY KEY,

  -- 외래 키 (wines 테이블 참조)
  wine_id BIGINT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,

  -- 물리적 위치
  shelf TEXT NOT NULL CHECK (shelf IN ('A', 'B', 'C')),  -- 선반 (A, B, C 중 하나)
  row INTEGER NOT NULL CHECK (row BETWEEN 1 AND 8),      -- 행 (1~8)
  col INTEGER NOT NULL CHECK (col BETWEEN 1 AND 4),      -- 열 (1~4)

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 유니크 제약: 한 위치에 하나의 병만
  CONSTRAINT unique_location UNIQUE (shelf, row, col)
);
```

#### 물리적 레이아웃

```
각 선반 (A, B, C):
- 8행 x 4열 = 32칸
- 총 3선반 = 96칸

예시:
A선반:
  열:  1  2  3  4
행1: [ ][ ][ ][ ]
행2: [ ][ ][🍷][ ]  ← A-3-2 (A선반 3행 2열)
행3: [🍷][ ][ ][🍷]
...
행8: [ ][ ][ ][ ]
```

#### 예시 데이터

```json
[
  {
    "id": 1,
    "wine_id": 1,
    "shelf": "A",
    "row": 3,
    "col": 2,
    "created_at": "2025-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "wine_id": 1,
    "shelf": "A",
    "row": 5,
    "col": 1,
    "created_at": "2025-01-15T10:31:00Z"
  }
]
```

→ wine_id = 1인 와인이 2병 있음 (A-3-2, A-5-1)

#### 인덱스

```sql
-- 와인별 재고 조회
CREATE INDEX idx_inventory_wine_id ON inventory(wine_id);

-- 위치별 조회
CREATE INDEX idx_inventory_location ON inventory(shelf, row, col);
```

**사용 예시:**
- 특정 와인의 위치: `SELECT * FROM inventory WHERE wine_id = 1`
- 특정 위치의 와인: `SELECT * FROM inventory WHERE shelf = 'A' AND row = 3 AND col = 2`

---

### 1.4 데이터베이스 관계

```
wines (1) ----< (N) inventory
  ↑
  │ wine_id (FK)
  │
한 와인이 여러 위치에 있을 수 있음
(예: Montes Alpha가 A-3-2, A-5-1, B-2-3에 있음)
```

**CASCADE 삭제:**
- `wines` 테이블에서 와인 삭제 → 해당 와인의 모든 `inventory` 레코드 자동 삭제

---

### 1.5 트리거 (자동 재고 계산)

#### 재고 자동 업데이트

```sql
CREATE OR REPLACE FUNCTION update_wine_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- inventory에 새 병 추가 → wines.stock +1
    UPDATE wines
    SET stock = stock + 1,
        updated_at = NOW()
    WHERE id = NEW.wine_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- inventory에서 병 제거 → wines.stock -1
    UPDATE wines
    SET stock = GREATEST(stock - 1, 0),  -- 0 이하로 안 내려감
        updated_at = NOW()
    WHERE id = OLD.wine_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER trigger_update_wine_stock_insert
AFTER INSERT ON inventory
FOR EACH ROW EXECUTE FUNCTION update_wine_stock();

CREATE TRIGGER trigger_update_wine_stock_delete
AFTER DELETE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_wine_stock();
```

**작동 원리:**
1. WMS에서 `inventory`에 병 추가 (`INSERT`) → `wines.stock` 자동 +1
2. WMS에서 `inventory`에서 병 제거 (`DELETE`) → `wines.stock` 자동 -1
3. Kiosk는 항상 최신 `stock` 값을 읽음 (실시간 동기화)

#### 타임스탬프 자동 업데이트

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- wines 테이블에 적용
CREATE TRIGGER trigger_wines_updated_at
BEFORE UPDATE ON wines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**작동 원리:**
- `wines` 테이블 업데이트 시 `updated_at` 자동 갱신

---

### 1.6 inventory_details 뷰 (편의용)

```sql
CREATE OR REPLACE VIEW inventory_details AS
SELECT
  i.id,
  i.wine_id,
  i.shelf,
  i.row,
  i.col,
  w.title,
  w.vintage,
  w.type,
  w.variety,
  w.winery,
  w.image,
  w.price,
  w.stock,
  i.created_at
FROM inventory i
JOIN wines w ON i.wine_id = w.id;
```

**사용 예시:**
```sql
-- WMS에서 사용 (Kiosk는 직접 사용 안함)
SELECT * FROM inventory_details WHERE shelf = 'A';
```

---

### 1.7 Kiosk에서 사용할 주요 쿼리

#### 1) 와인 목록 조회 (필터링)

```sql
-- 모든 와인
SELECT * FROM wines ORDER BY title;

-- 타입별 필터
SELECT * FROM wines WHERE type = 'Red wine' ORDER BY title;

-- 국가별 필터
SELECT * FROM wines WHERE country = 'Chile' ORDER BY title;

-- 가격 범위 필터
SELECT * FROM wines WHERE price BETWEEN 20000 AND 50000 ORDER BY title;

-- 검색
SELECT * FROM wines WHERE title ILIKE '%Montes%' OR winery ILIKE '%Montes%';

-- 복합 필터
SELECT * FROM wines
WHERE type = 'Red wine'
  AND country = 'Chile'
  AND price <= 50000
ORDER BY title;
```

#### 2) 와인 상세 조회

```sql
SELECT * FROM wines WHERE id = 1;
```

#### 3) 재고 위치 조회

```sql
-- 특정 와인의 모든 위치
SELECT * FROM inventory
WHERE wine_id = 1
ORDER BY shelf, row, col;
```

**결과 예시:**
```
id | wine_id | shelf | row | col | created_at
---|---------|-------|-----|-----|------------
1  | 1       | A     | 3   | 2   | 2025-01-15
2  | 1       | A     | 5   | 1   | 2025-01-15
3  | 1       | B     | 2   | 3   | 2025-01-15
```

→ 고객에게 표시: "A-3-2, A-5-1, B-2-3"

---

### 1.8 데이터 흐름 (WMS ↔ Kiosk)

```
1. WMS에서 와인 추가 (wines INSERT)
   ↓
2. WMS에서 재고 위치 등록 (inventory INSERT)
   ↓
3. 트리거 실행 (wines.stock +1)
   ↓
4. Kiosk가 API 호출 (/api/wines)
   ↓
5. Kiosk에 최신 데이터 표시 (실시간 동기화)
```

**Kiosk 특징:**
- 30초마다 자동 갱신 (`staleTime: 30000`)
- 읽기 전용 (`SELECT`만 사용)
- 트리거에 의해 자동 계산된 `stock` 값 표시

---

### 1.9 데이터베이스 연결 정보

#### Supabase 프로젝트

```
Project: cglthkapppsmflmfkite
URL: https://cglthkapppsmflmfkite.supabase.co
Region: Asia Pacific (ap-northeast-2, Seoul)
```

#### 환경 변수

```bash
SUPABASE_URL=https://cglthkapppsmflmfkite.supabase.co
SUPABASE_ANON_KEY=실제_키_값
```

**보안:**
- `ANON_KEY`는 읽기 권한만 가짐 (안전)
- Row Level Security (RLS) 설정 가능 (선택사항)

---

### 1.10 데이터베이스 요약

| 항목 | 설명 |
|------|------|
| **DBMS** | PostgreSQL (Supabase) |
| **테이블** | `wines`, `inventory` |
| **뷰** | `inventory_details` |
| **트리거** | 재고 자동 계산, 타임스탬프 자동 업데이트 |
| **인덱스** | 7개 (성능 최적화) |
| **제약조건** | FK, CHECK, UNIQUE |
| **WMS 권한** | CRUD (모든 권한) |
| **Kiosk 권한** | READ ONLY (조회만) |
| **동기화** | 실시간 (트리거 기반) |

---

## 2. 프로젝트 개요

### 1.1 Podoring Kiosk란?

- **목적**: 고객이 직접 와인을 검색하고 정보를 확인할 수 있는 터치 기반 키오스크 앱
- **대상**: 안드로이드 태블릿 (10-13인치, 키오스크 모드)
- **WMS와의 관계**:
  - **WMS**: 관리자용 (와인 추가, 수정, 삭제, 재고 관리)
  - **Kiosk**: 고객용 (와인 조회만, **읽기 전용**)
  - **동일한 Supabase DB 공유** (실시간 동기화)

### 1.2 Phase 구분

#### Phase 1: 와인 카탈로그 키오스크 UI (현재)
- ✅ 홈 화면 (타입별 카테고리)
- ✅ 와인 목록 (검색, 필터, A-Z 정렬)
- ✅ 와인 상세 정보
- ✅ 재고 위치 표시 (A-3-2)
- ✅ 터치 최적화 UI
- ✅ PWA (Progressive Web App)

#### Phase 2: 음성/AI 대화 기능 (미래)
- 🔜 Web Speech API (음성 인식/합성)
- 🔜 Python FastAPI (음성 분석: 성별/연령)
- 🔜 Gemini 대화형 추천
- 🔜 사용자 프로필 기반 추천

---

## 2. 기술 스택

### 2.1 Backend
```
Runtime:    Bun 1.x
Server:     Bun.serve() (built-in routing)
Database:   Supabase (PostgreSQL) - WMS와 동일한 DB
API:        REST API (읽기 전용)
Port:       4000 (WMS는 3000)
```

### 2.2 Frontend
```
Framework:  React 18 + TypeScript
Routing:    React Router DOM
Styling:    ⚠️ Figma 디자인 시스템 사용 (기존 Tailwind 참고만)
State:      @tanstack/react-query (서버 상태)
            Zustand (클라이언트 상태)
Icons:      Lucide React
Build:      Bun's built-in bundler
PWA:        manifest.json
```

### 2.3 배포
```
Server:     Railway
Database:   Supabase Cloud (기존 WMS DB)
Domain:     kiosk.podoring.app (예정)
```

---

## 3. 디렉토리 구조

### 3.1 전체 프로젝트 구조

```
podoring_kiosk/
├── .gitignore
├── .env.example                  # 환경 변수 템플릿
├── .env.local                    # 환경 변수 (로컬, gitignore)
├── package.json
├── tsconfig.json
├── bunfig.toml
├── railway.toml                  # Railway 배포 설정
├── nixpacks.toml                 # Bun 빌드 설정
├── KIOSK_PLAN.md                 # 이 파일
├── README.md
├── CLAUDE.md                     # Bun 개발 가이드
│
└── src/
    ├── index.ts                  # Bun 서버 엔트리포인트
    │
    ├── db/
    │   └── supabase.ts           # Supabase 클라이언트 (서버용)
    │
    ├── api/
    │   ├── wines.ts              # 와인 API (읽기 전용)
    │   └── inventory.ts          # 재고 API (읽기 전용)
    │
    ├── types/
    │   └── index.ts              # TypeScript 타입 정의
    │
    └── frontend/
        ├── index.html            # PWA 메인 HTML
        ├── manifest.json         # PWA 설정
        ├── app.tsx               # React 루트
        ├── polyfill.js           # Supabase polyfill
        │
        ├── components/
        │   ├── KioskLayout.tsx           # 레이아웃 (헤더, 푸터)
        │   ├── HomePage.tsx              # 홈 화면
        │   ├── WineCatalog.tsx           # 와인 목록
        │   ├── WineCard.tsx              # 와인 카드
        │   ├── WineDetail.tsx            # 와인 상세
        │   ├── SearchBar.tsx             # 검색 바
        │   ├── FilterPanel.tsx           # 필터 패널
        │   └── InventoryLocation.tsx    # 재고 위치 표시
        │
        ├── hooks/
        │   ├── useWines.ts               # 와인 데이터 훅
        │   ├── useInventory.ts           # 재고 데이터 훅
        │   └── useKioskState.ts          # 키오스크 상태 (Zustand)
        │
        ├── lib/
        │   └── supabase.ts               # Supabase 클라이언트 (브라우저용)
        │
        └── styles/
            └── kiosk.css                 # Figma 디자인 시스템 구현
```

---

## 4. 환경 설정

### 4.1 새 프로젝트 폴더 생성

```bash
# 1. 새 폴더 생성
mkdir podoring_kiosk
cd podoring_kiosk

# 2. Bun 초기화
bun init -y

# 3. Git 초기화
git init

# 4. 이 KIOSK_PLAN.md 파일을 복사
# (기존 podoring_wms/KIOSK_PLAN.md → podoring_kiosk/KIOSK_PLAN.md)
```

### 4.2 필수 파일 생성

#### package.json

```json
{
  "name": "podoring-kiosk",
  "version": "1.0.0",
  "description": "Podoring Wine Kiosk - Customer Interface",
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "lucide-react": "^0.545.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "bun-types": "latest",
    "typescript": "^5.3.0"
  }
}
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### bunfig.toml

```toml
[install]
optional = true
dev = true
peer = true
production = false
```

#### .env.example

```bash
# Supabase (WMS와 동일한 DB 사용)
SUPABASE_URL=https://cglthkapppsmflmfkite.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Server
PORT=4000
NODE_ENV=development
```

#### .gitignore

```
# Bun
node_modules/
bun.lockb
.env.local
.env

# Build
dist/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

#### CLAUDE.md

```markdown
# Podoring Kiosk Development Guide

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env, so don't use dotenv

## APIs

- `Bun.serve()` supports routes, WebSockets
- Prefer `Bun.file` over `node:fs`

## Frontend

Use HTML imports with `Bun.serve()`. HTML imports support React, CSS.

For more information, read the Bun API docs.
```

### 4.3 의존성 설치

```bash
bun install
```

### 4.4 환경 변수 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local

# .env.local 파일을 열고 실제 값 입력
# SUPABASE_URL=https://cglthkapppsmflmfkite.supabase.co
# SUPABASE_ANON_KEY=실제_키_값
```

---

## 5. 백엔드 구현

### 5.1 TypeScript 타입 정의

#### src/types/index.ts

```typescript
// Wine 타입 (WMS와 동일)
export interface Wine {
  id: number
  title: string
  points: number | null
  vintage: number | null
  type: 'Red wine' | 'White wine' | 'Rosé wine' | 'Sparkling wine' | 'Dessert wine' | null
  variety: string | null
  region_2: string | null
  region_1: string | null
  province: string | null
  country: string | null
  winery: string | null
  price: number | null
  abv: number | null
  description: string | null
  taste: string | null
  acidity: number | null
  sweetness: number | null
  tannin: number | null
  body: number | null
  cost_effectiveness: number | null
  image: string | null
  vivino_url: string | null
  stock: number
  created_at: string
  updated_at: string
}

// Inventory 타입 (WMS와 동일)
export interface Inventory {
  id: number
  wine_id: number
  shelf: 'A' | 'B' | 'C'
  row: number  // 1-8
  col: number  // 1-4
  created_at: string
}
```

---

### 5.2 Supabase 클라이언트 설정

#### src/db/supabase.ts (서버용)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Bun.env.SUPABASE_URL
const supabaseAnonKey = Bun.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('✅ Supabase connected')
```

---

### 5.3 API 구현 (읽기 전용)

#### src/api/wines.ts

```typescript
import { supabase } from '../db/supabase'
import type { Wine } from '../types'

/**
 * 와인 목록 조회 (필터링 지원)
 */
export async function getWines(filters?: {
  type?: string
  country?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}): Promise<Wine[]> {
  let query = supabase
    .from('wines')
    .select('*')
    .order('title')

  // 타입 필터
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  // 국가 필터
  if (filters?.country && filters.country !== 'all') {
    query = query.eq('country', filters.country)
  }

  // 가격 필터
  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice)
  }
  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  // 검색 (와인명 또는 와이너리)
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,winery.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []) as Wine[]
}

/**
 * 와인 상세 조회 (ID)
 */
export async function getWineById(id: number): Promise<Wine | null> {
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null  // Not found
    throw error
  }

  return data as Wine
}
```

#### src/api/inventory.ts

```typescript
import { supabase } from '../db/supabase'
import type { Inventory } from '../types'

/**
 * 와인의 재고 위치 조회
 */
export async function getInventoryByWineId(wineId: number): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('wine_id', wineId)
    .order('shelf')
    .order('row')
    .order('col')

  if (error) throw error
  return (data || []) as Inventory[]
}
```

---

### 5.4 Bun 서버 설정

#### src/index.ts

```typescript
import indexHtml from "./frontend/index.html"
import { getWines, getWineById } from "./api/wines"
import { getInventoryByWineId } from "./api/inventory"

const PORT = Number(Bun.env.PORT) || 4000

Bun.serve({
  port: PORT,

  // Static file serving
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
    // Frontend
    "/": indexHtml,

    // Health check
    "/api/health": {
      GET: () => new Response(JSON.stringify({ status: "ok", service: "kiosk" }), {
        headers: { "Content-Type": "application/json" }
      })
    },

    // Get all wines with filters
    "/api/wines": {
      GET: async (req) => {
        try {
          const url = new URL(req.url)
          const filters = {
            type: url.searchParams.get('type') || undefined,
            country: url.searchParams.get('country') || undefined,
            minPrice: url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined,
            maxPrice: url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined,
            search: url.searchParams.get('search') || undefined,
          }

          const wines = await getWines(filters)

          return new Response(JSON.stringify(wines), {
            headers: { "Content-Type": "application/json" }
          })
        } catch (error: any) {
          console.error('Error fetching wines:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          })
        }
      }
    },

    // Get wine by ID
    "/api/wines/:id": {
      GET: async (req) => {
        try {
          const id = Number(req.params.id)

          if (isNaN(id)) {
            return new Response(JSON.stringify({ error: "Invalid wine ID" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            })
          }

          const wine = await getWineById(id)

          if (!wine) {
            return new Response(JSON.stringify({ error: "Wine not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            })
          }

          return new Response(JSON.stringify(wine), {
            headers: { "Content-Type": "application/json" }
          })
        } catch (error: any) {
          console.error('Error fetching wine:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          })
        }
      }
    },

    // Get inventory by wine ID
    "/api/inventory/:wine_id": {
      GET: async (req) => {
        try {
          const wineId = Number(req.params.wine_id)

          if (isNaN(wineId)) {
            return new Response(JSON.stringify({ error: "Invalid wine ID" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            })
          }

          const inventory = await getInventoryByWineId(wineId)

          return new Response(JSON.stringify(inventory), {
            headers: { "Content-Type": "application/json" }
          })
        } catch (error: any) {
          console.error('Error fetching inventory:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          })
        }
      }
    }
  },

  development: {
    hmr: true,
    console: true,
  }
})

console.log(`🍷 Podoring Kiosk running on http://localhost:${PORT}`)
```

**백엔드 테스트:**

```bash
# 서버 시작
bun run dev

# 다른 터미널에서 테스트
curl http://localhost:4000/api/health
curl http://localhost:4000/api/wines
curl http://localhost:4000/api/wines/1
curl http://localhost:4000/api/inventory/1
```

---

## 6. 프론트엔드 구현

### 6.1 Supabase 브라우저 클라이언트

#### src/frontend/polyfill.js

```javascript
// Supabase polyfill for browser
globalThis.global = globalThis
globalThis.process = { env: {} }
globalThis.Buffer = class Buffer extends Uint8Array {
  static from(data) {
    return new Uint8Array(data)
  }
  static alloc(size) {
    return new Uint8Array(size)
  }
}
```

#### src/frontend/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'

// 브라우저에서는 window.__ENV__로 접근
const supabaseUrl = (window as any).__ENV__?.SUPABASE_URL
const supabaseAnonKey = (window as any).__ENV__?.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### 6.2 index.html (PWA 설정)

#### src/frontend/index.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
  <meta name="description" content="Podoring Wine Kiosk - Find Your Perfect Wine">
  <meta name="theme-color" content="#A80569">
  <title>Podoring Wine Kiosk</title>

  <!-- PWA -->
  <link rel="manifest" href="./manifest.json">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <!-- ⚠️ Figma 디자인 시스템 CSS는 여기에 추가 -->
  <link rel="stylesheet" href="./styles/kiosk.css">

  <!-- 기본 리셋 -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      overscroll-behavior: none;
      user-select: none;
      -webkit-user-select: none;
    }

    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Environment variables (서버에서 주입) -->
  <script>
    window.__ENV__ = {
      SUPABASE_URL: '${Bun.env.SUPABASE_URL}',
      SUPABASE_ANON_KEY: '${Bun.env.SUPABASE_ANON_KEY}'
    }
  </script>

  <!-- Polyfill -->
  <script src="./polyfill.js"></script>

  <!-- React App -->
  <script type="module" src="./app.tsx"></script>
</body>
</html>
```

#### src/frontend/manifest.json

```json
{
  "name": "Podoring Wine Kiosk",
  "short_name": "Podoring Kiosk",
  "description": "Find Your Perfect Wine",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#F3F1EA",
  "theme_color": "#A80569",
  "icons": [
    {
      "src": "/img/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/img/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 6.3 React App 진입점

#### src/frontend/app.tsx

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Components (아직 생성 안함 - 6.4, 6.5, 6.6에서 생성)
import KioskLayout from './components/KioskLayout'
import HomePage from './components/HomePage'
import WineCatalog from './components/WineCatalog'
import WineDetail from './components/WineDetail'

// React Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,  // 30초
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <KioskLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wines" element={<WineCatalog />} />
            <Route path="/wines/:id" element={<WineDetail />} />
          </Routes>
        </KioskLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

---

### 6.4 React Hooks (데이터 페칭)

#### src/frontend/hooks/useWines.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import type { Wine } from '../../types'

export function useWines(filters?: {
  type?: string
  country?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['wines', filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters?.type && filters.type !== 'all') {
        params.set('type', filters.type)
      }
      if (filters?.country && filters.country !== 'all') {
        params.set('country', filters.country)
      }
      if (filters?.search) {
        params.set('search', filters.search)
      }

      const response = await fetch(`/api/wines?${params}`)
      if (!response.ok) throw new Error('Failed to fetch wines')

      return response.json() as Promise<Wine[]>
    }
  })
}

export function useWine(id: string | number) {
  return useQuery({
    queryKey: ['wine', id],
    queryFn: async () => {
      const response = await fetch(`/api/wines/${id}`)
      if (!response.ok) throw new Error('Failed to fetch wine')

      return response.json() as Promise<Wine>
    },
    enabled: !!id,  // id가 있을 때만 실행
  })
}
```

#### src/frontend/hooks/useInventory.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import type { Inventory } from '../../types'

export function useInventory(wineId: string | number) {
  return useQuery({
    queryKey: ['inventory', wineId],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/${wineId}`)
      if (!response.ok) throw new Error('Failed to fetch inventory')

      return response.json() as Promise<Inventory[]>
    },
    enabled: !!wineId,  // wineId가 있을 때만 실행
  })
}
```

#### src/frontend/hooks/useKioskState.ts

```typescript
import { create } from 'zustand'

interface KioskState {
  // 비활성 상태
  isIdle: boolean
  setIsIdle: (isIdle: boolean) => void

  // 마지막 활동 시간
  lastActivity: number
  updateActivity: () => void

  // 필터 상태 (선택사항)
  filters: {
    type: string
    country: string
    search: string
  }
  setFilters: (filters: Partial<KioskState['filters']>) => void
  resetFilters: () => void
}

export const useKioskState = create<KioskState>((set) => ({
  isIdle: false,
  setIsIdle: (isIdle) => set({ isIdle }),

  lastActivity: Date.now(),
  updateActivity: () => set({ lastActivity: Date.now() }),

  filters: {
    type: 'all',
    country: 'all',
    search: '',
  },
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: { type: 'all', country: 'all', search: '' }
  }),
}))
```

---

### 6.5 React Components (뼈대만 - 디자인은 Figma에서)

#### src/frontend/components/KioskLayout.tsx

```tsx
import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

export default function KioskLayout({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // 30초 비활성 시 홈으로 자동 복귀
  useEffect(() => {
    let timeout: Timer

    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (location.pathname !== '/') {
          console.log('30초 비활성 - 홈으로 복귀')
          navigate('/')
        }
      }, 30000) // 30초
    }

    // 사용자 활동 감지
    const events = ['mousedown', 'touchstart', 'mousemove', 'keypress']
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      clearTimeout(timeout)
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [location.pathname, navigate])

  return (
    <div className="kiosk-layout">
      {/* Header */}
      <header className="kiosk-header">
        <h1>Podoring Wine Kiosk</h1>
        <div className="time">
          {new Date().toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="kiosk-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="kiosk-footer">
        <p>© 2025 Podoring. All rights reserved.</p>
      </footer>
    </div>
  )
}
```

#### src/frontend/components/HomePage.tsx

```tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Wine } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()

  const categories = [
    { type: 'all', label: '전체 와인' },
    { type: 'Red wine', label: '레드 와인' },
    { type: 'White wine', label: '화이트 와인' },
    { type: 'Rosé wine', label: '로제 와인' },
    { type: 'Sparkling wine', label: '스파클링 와인' },
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero">
        <Wine size={80} />
        <h1>Podoring Wine Catalog</h1>
        <p>Find Your Perfect Wine</p>
      </div>

      {/* Categories */}
      <div className="categories">
        {categories.map(category => (
          <button
            key={category.type}
            onClick={() => navigate(`/wines?type=${category.type}`)}
            className="category-button"
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="와인 이름, 국가, 품종으로 검색..."
          onFocus={() => navigate('/wines')}
        />
      </div>
    </div>
  )
}
```

#### src/frontend/components/WineCatalog.tsx

```tsx
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { useWines } from '../hooks/useWines'
import WineCard from './WineCard'

export default function WineCatalog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [country, setCountry] = useState('all')

  // Fetch wines
  const { data: wines = [], isLoading } = useWines({ type, country, search })

  return (
    <div className="wine-catalog">
      {/* Header */}
      <div className="catalog-header">
        <button onClick={() => navigate('/')} className="back-button">
          <ArrowLeft size={20} />
          <span>뒤로</span>
        </button>
        <h2>{type === 'all' ? '전체 와인' : type} ({wines.length}개)</h2>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="와인 검색..."
          />
        </div>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">모든 타입</option>
          <option value="Red wine">레드 와인</option>
          <option value="White wine">화이트 와인</option>
          <option value="Rosé wine">로제 와인</option>
          <option value="Sparkling wine">스파클링 와인</option>
        </select>

        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="all">모든 국가</option>
          <option value="France">프랑스</option>
          <option value="Italy">이탈리아</option>
          <option value="Spain">스페인</option>
          <option value="Chile">칠레</option>
        </select>
      </div>

      {/* Wine Grid */}
      {isLoading ? (
        <div className="loading">와인 목록을 불러오는 중...</div>
      ) : wines.length === 0 ? (
        <div className="empty">검색 결과가 없습니다</div>
      ) : (
        <div className="wine-grid">
          {wines.map(wine => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### src/frontend/components/WineCard.tsx

```tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Wine } from '../../types'

interface Props {
  wine: Wine
}

export default function WineCard({ wine }: Props) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/wines/${wine.id}`)}
      className="wine-card"
    >
      {/* Wine Image */}
      <div className="wine-image">
        {wine.image ? (
          <img src={wine.image} alt={wine.title} />
        ) : (
          <div className="placeholder">🍷</div>
        )}
      </div>

      {/* Wine Info */}
      <div className="wine-info">
        <h3 className="wine-title">{wine.title}</h3>
        <p className="wine-winery">{wine.winery || 'Unknown Winery'}</p>

        <div className="wine-meta">
          {wine.price && (
            <span className="price">₩{wine.price.toLocaleString()}</span>
          )}
          {wine.points && (
            <span className="rating">⭐ {wine.points}</span>
          )}
        </div>

        <div className="wine-footer">
          <span className="type">{wine.type}</span>
          <span className="stock">재고: {wine.stock}병</span>
        </div>
      </div>
    </div>
  )
}
```

#### src/frontend/components/WineDetail.tsx

```tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useWine } from '../hooks/useWines'
import { useInventory } from '../hooks/useInventory'
import InventoryLocation from './InventoryLocation'

export default function WineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: wine, isLoading: wineLoading } = useWine(id!)
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(id!)

  if (wineLoading || !wine) {
    return <div className="loading">와인 정보를 불러오는 중...</div>
  }

  return (
    <div className="wine-detail">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="back-button">
        <ArrowLeft size={20} />
        <span>뒤로</span>
      </button>

      {/* Wine Content */}
      <div className="detail-content">
        {/* Wine Image */}
        <div className="detail-image">
          {wine.image ? (
            <img src={wine.image} alt={wine.title} />
          ) : (
            <div className="placeholder">🍷</div>
          )}
        </div>

        {/* Wine Info */}
        <div className="detail-info">
          <h1>{wine.title}</h1>

          {wine.points && (
            <div className="rating">⭐ {wine.points}</div>
          )}

          {wine.type && (
            <span className="type-badge">{wine.type}</span>
          )}

          {wine.price && (
            <p className="price">₩{wine.price.toLocaleString()}</p>
          )}

          {/* Inventory Location */}
          {!inventoryLoading && inventory.length > 0 && (
            <div className="inventory-section">
              <MapPin size={20} />
              <h3>재고 위치</h3>
              <InventoryLocation inventory={inventory} />
            </div>
          )}

          {/* Wine Details */}
          <div className="wine-details">
            {wine.winery && (
              <div className="detail-item">
                <span className="label">와이너리</span>
                <span className="value">{wine.winery}</span>
              </div>
            )}
            {wine.variety && (
              <div className="detail-item">
                <span className="label">품종</span>
                <span className="value">{wine.variety}</span>
              </div>
            )}
            {wine.country && (
              <div className="detail-item">
                <span className="label">국가</span>
                <span className="value">{wine.country}</span>
              </div>
            )}
            {wine.vintage && (
              <div className="detail-item">
                <span className="label">빈티지</span>
                <span className="value">{wine.vintage}</span>
              </div>
            )}
            {wine.abv && (
              <div className="detail-item">
                <span className="label">알코올</span>
                <span className="value">{wine.abv}%</span>
              </div>
            )}
          </div>

          {/* Description */}
          {wine.description && (
            <div className="description">
              <h3>와인 설명</h3>
              <p>{wine.description}</p>
            </div>
          )}

          {/* Tasting Notes */}
          {wine.taste && (
            <div className="tasting-notes">
              <h3>테이스팅 노트</h3>
              <p>{wine.taste}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### src/frontend/components/InventoryLocation.tsx

```tsx
import React from 'react'
import type { Inventory } from '../../types'

interface Props {
  inventory: Inventory[]
}

export default function InventoryLocation({ inventory }: Props) {
  return (
    <div className="inventory-locations">
      {inventory.map((item) => (
        <div key={item.id} className="location-badge">
          {item.shelf}선반 {item.row}행 {item.col}열
        </div>
      ))}
    </div>
  )
}
```

---

### 6.6 CSS 스타일 (Figma 디자인 적용)

#### src/frontend/styles/kiosk.css

```css
/* ⚠️ 이 파일은 Figma 디자인 시스템을 적용할 때 사용 */
/* 현재는 기본 스타일만 제공 - 실제 디자인은 Figma에서 추출 */

/* ======================
   기본 변수 (Figma에서 추출 예정)
   ====================== */
:root {
  --color-primary: #A80569;
  --color-bg: #F3F1EA;
  --color-card: #F4F2EF;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --border-radius: 12px;
}

/* ======================
   레이아웃
   ====================== */
.kiosk-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.kiosk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.kiosk-main {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.kiosk-footer {
  padding: var(--spacing-md);
  text-align: center;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

/* ======================
   홈 화면
   ====================== */
.home-page {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.category-button {
  padding: var(--spacing-lg);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
}

.category-button:active {
  transform: scale(0.98);
}

/* ======================
   와인 카탈로그
   ====================== */
.wine-catalog {
  max-width: 1400px;
  margin: 0 auto;
}

.catalog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius);
  cursor: pointer;
}

.filters {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius);
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
}

.filters select {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius);
  font-size: 16px;
}

.wine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

/* ======================
   와인 카드
   ====================== */
.wine-card {
  background-color: var(--color-card);
  border-radius: var(--border-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.wine-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.wine-image {
  aspect-ratio: 3/4;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wine-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.wine-image .placeholder {
  font-size: 64px;
}

.wine-info {
  padding: var(--spacing-md);
}

.wine-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.wine-winery {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.wine-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.wine-footer {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

/* ======================
   와인 상세
   ====================== */
.wine-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-lg);
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius);
}

.detail-image {
  aspect-ratio: 3/4;
  background-color: #f5f5f5;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-info h1 {
  font-size: 28px;
  margin-bottom: var(--spacing-md);
}

.price {
  font-size: 24px;
  color: var(--color-primary);
  font-weight: bold;
  margin: var(--spacing-md) 0;
}

.wine-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 14px;
  color: #666;
}

.detail-item .value {
  font-size: 16px;
  font-weight: 500;
}

/* ======================
   재고 위치
   ====================== */
.inventory-section {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background-color: #f9f9f9;
  border-radius: var(--border-radius);
}

.inventory-locations {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.location-badge {
  padding: 8px 16px;
  background-color: white;
  border: 2px solid var(--color-primary);
  border-radius: var(--border-radius);
  font-weight: bold;
  color: var(--color-primary);
}

/* ======================
   유틸리티
   ====================== */
.loading, .empty {
  text-align: center;
  padding: var(--spacing-lg);
  font-size: 18px;
  color: #666;
}

/* 반응형 (태블릿) */
@media (max-width: 1024px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .wine-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
```

---

## 7. Railway 배포

### 7.1 Railway 설정 파일

#### railway.toml

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "bun run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### nixpacks.toml

```toml
[phases.setup]
nixPkgs = ["bun"]

[phases.install]
cmds = ["bun install --frozen-lockfile"]

[phases.build]
cmds = []

[start]
cmd = "bun run start"
```

### 7.2 배포 단계

```bash
# 1. Git 커밋
git add .
git commit -m "Initial Podoring Kiosk"

# 2. GitHub 저장소 생성 (웹에서)
# https://github.com/new

# 3. GitHub에 Push
git remote add origin https://github.com/your-username/podoring_kiosk.git
git branch -M main
git push -u origin main

# 4. Railway 배포
# https://railway.app/dashboard
# - New Project → Deploy from GitHub repo
# - podoring_kiosk 선택

# 5. 환경 변수 설정 (Railway Dashboard)
# Settings → Variables:
#   SUPABASE_URL=https://cglthkapppsmflmfkite.supabase.co
#   SUPABASE_ANON_KEY=실제_키
#   NODE_ENV=production

# 6. 도메인 생성
# Settings → Networking → Generate Domain
```

---

## 8. Phase 2 계획

### 8.1 음성/AI 대화 기능 (미래)

#### 아키텍처

```
React PWA (Kiosk)
    ↓
Bun Server (Port 4000)
    ↓
Python FastAPI (Port 8000) - 음성 분석
    ↓
Gemini API - 대화/추천
```

#### 주요 기능

1. **음성 인식** (Web Speech API or Google STT)
2. **음성 분석** (Python: 성별/연령 추정)
3. **대화형 추천** (Gemini + 와인 DB)
4. **음성 합성** (Web Speech API or Google TTS)

#### Python 서비스 (별도 프로젝트)

```python
# podoring_python/main.py
from fastapi import FastAPI

app = FastAPI()

@app.post("/analyze-voice")
async def analyze_voice(audio: str):
    # librosa로 음성 분석
    # 성별/연령 추정
    return {
        "gender": "male",
        "age_group": "30s",
        "confidence": 0.85
    }
```

---

## 9. 체크리스트

### Phase 1 완료 체크리스트

- [ ] 프로젝트 초기화 (`mkdir podoring_kiosk && cd podoring_kiosk`)
- [ ] 의존성 설치 (`bun install`)
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] Supabase 연결 테스트
- [ ] 서버 실행 (`bun run dev`)
- [ ] `/api/health` 테스트
- [ ] `/api/wines` 테스트
- [ ] HomePage 작동 확인
- [ ] WineCatalog 작동 확인
- [ ] WineDetail 작동 확인
- [ ] 검색 기능 테스트
- [ ] 필터 기능 테스트
- [ ] 재고 위치 표시 확인
- [ ] **Figma 디자인 시스템 적용**
- [ ] 터치 인터페이스 테스트 (태블릿)
- [ ] 자동 홈 복귀 테스트 (30초)
- [ ] Git 커밋 + GitHub Push
- [ ] Railway 배포
- [ ] 도메인 설정
- [ ] 실제 태블릿에서 테스트
- [ ] Fully Kiosk Browser 설정

---

## 10. 트러블슈팅

### 문제: Supabase 연결 실패

```
Error: Missing Supabase environment variables
```

**해결책:**
1. `.env.local` 파일이 있는지 확인
2. `SUPABASE_URL`과 `SUPABASE_ANON_KEY` 값이 정확한지 확인
3. 서버 재시작 (`bun run dev`)

### 문제: Railway 배포 실패

```
Error: Command not found: bun
```

**해결책:**
1. `railway.toml`에 `builder = "NIXPACKS"` 확인
2. `nixpacks.toml`에 `nixPkgs = ["bun"]` 확인

### 문제: React Router 404

**해결책:**
1. `BrowserRouter` 사용 확인
2. `src/index.ts`에서 모든 경로를 `indexHtml`로 라우팅

---

## 11. 다음 단계

### Figma 디자인 적용

1. Figma에서 디자인 시스템 추출
2. `src/frontend/styles/kiosk.css` 업데이트
3. 컴포넌트 클래스명 매칭
4. 색상 변수 업데이트 (`:root`)
5. 터치 인터페이스 최적화
6. 반응형 레이아웃 (태블릿 사이즈)

### 태블릿 배포

1. Fully Kiosk Browser 설치
2. 키오스크 모드 설정
3. 자동 시작 설정
4. 화면 항상 켜짐
5. 홈 버튼 비활성화

---

## 12. 참고 자료

- [Bun Documentation](https://bun.sh/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Railway Documentation](https://docs.railway.app/)
- [Fully Kiosk Browser](https://www.fully-kiosk.com/)

---

## 13. Claude Code 사용 팁

새 프로젝트 폴더에서 이 `KIOSK_PLAN.md` 파일을 열고 Claude Code에게 다음과 같이 요청하세요:

```
"KIOSK_PLAN.md를 읽고 Podoring Kiosk 개발을 도와줘.
먼저 Step 4.2의 필수 파일들을 생성해줘."
```

또는:

```
"KIOSK_PLAN.md의 Step 5.4를 보고 src/index.ts 파일을 생성해줘."
```

---

© 2025 Podoring. All rights reserved.
