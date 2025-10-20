# 🍷 Podoring WMS - Wine Management System

와인 재고 관리 시스템 with AI-powered Wine Label Recognition

## 📋 프로젝트 개요

고객사 와인 매장의 재고를 효율적으로 관리하기 위한 웹 애플리케이션입니다.

### 주요 기능

1. **와인 관리** (A-데이터베이스)
   - 와인 정보 CRUD (추가, 수정, 삭제, 조회)
   - 검색, 필터링, 정렬 (A-Z 알파벳 순)
   - 21개 필드: 와인명, 빈티지, 품종, 국가, 가격, 평점, 테이스트 노트 등

2. **재고 관리** (B-데이터베이스)
   - 선반별 그리드 뷰 (A/B/C, 각 8행x4열 = 32병)
   - 재고 위치 추적 (선반, 행, 열) with 위치 고정 기능
   - 실시간 재고 수량 자동 계산

3. **AI 자동 생성 시스템** (4단계 파이프라인)
   - **Pre-Step**: 모바일 카메라로 와인 라벨 촬영 → Gemini 2.5-flash로 이미지 분석
   - **Step 1**: Google Custom Search API로 Vivino URL 검색
   - **Step 2**: Gemini Grounding으로 Vivino에서 기본 정보 추출 (7개 쿼리 최적화)
   - **Step 3 & 4 (병렬)**: 테이스팅 노트 추출 + 와인 이미지 10개 검색
   - **처리 시간**: 평균 60초, **정확도**: 90-95%

4. **대시보드** (실시간 자동 갱신 - 10초)
   - 총 와인 종류, 총 재고, 재고 부족 알림
   - 선반별 재고 현황 (진행률 바)
   - 재고 TOP 5 (이미지 포함)
   - 타입별 와인 분포 (도넛 차트 with 그라데이션)
   - 국가별 와인 분포 (수평 막대 그래프)
   - 날짜별 와인 추가 현황 (꺾은선 그래프, 최근 7일)

5. **와인 임베딩 & 시맨틱 검색** (RAG 시스템 + Cohere Reranker)
   - **2-Stage Search Architecture**:
     - Stage 1 (Retrieval): OpenAI text-embedding-3-small + pgvector (50 후보, threshold 0.3)
     - Stage 2 (Reranking): Cohere rerank-english-v3.0 (Top 3 정제)
   - HNSW 인덱스로 빠른 벡터 검색 (Hierarchical Navigable Small World)
   - 자연어 쿼리로 와인 검색 (영어 쿼리, 평균 응답 시간 0.5-0.8초)
   - **정확도 향상**: 60-70% → 85-95%+ (Cohere Reranker 적용)
   - **Relevance Score**: 각 결과에 0-1 범위의 관련성 점수 제공
   - **자동 임베딩 생성**: 와인 추가 시 자동 임베딩 생성 (~0.6초)
   - **자동 임베딩 업데이트**: 와인 수정 시 자동 재생성
   - **자동 임베딩 삭제**: 와인 삭제 시 CASCADE로 자동 삭제
   - 일괄 임베딩 재생성 API (80개 와인 ~60초)

## 🏗️ 기술 스택

### Backend
- **Runtime**: Bun 1.x
- **Server**: Bun.serve() (WebSocket, routes, static file serving)
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini 2.5-flash (이미지 분석 + Grounding)
- **Embeddings**: OpenAI text-embedding-3-small (시맨틱 검색)
- **Reranking**: Cohere rerank-english-v3.0 (검색 결과 정제)
- **Search**: Google Custom Search API (Vivino URL + 이미지 검색)

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS (CDN)
- **State Management**: @tanstack/react-query
- **Icons**: Lucide React
- **Build**: Bun's built-in bundler
- **Responsive**: Mobile-first design

### Deployment
- **Server**: Railway
- **Database**: Supabase Cloud

## 🎨 UI/UX Design

### Color Palette
- Brand Color: `#A80569` (wine-600)
- Background: `#EAE8E4` with gradient to `#DDD9D0`
- Card Background: `#F4F2EF`
- Header/Nav/Footer: `#F3F1EA` (ivory)
- Inner Items: `#E6E7EB`

### Chart Colors (Wine-themed)
- Red wine: `#B05B6C`, White wine: `#D4B97A`, Rosé: `#E8B5B5`
- Sparkling: `#7A9FBF`, Dessert: `#C89158`

### Features
- Lucide React icons for modern UI
- Custom logo and favicon (podoring_wms_logo.png, podoring_icon.png)
- Responsive donut chart with drop shadow and gradient
- Interactive line chart with area fill
- Alphabetical sorting for all lists
- Price display with thousand separators (₩60,000)
- Vivino rating with official logo badge

## 📂 프로젝트 구조

```
podoring_wms/
├── CLAUDE.md                        # Bun 개발 가이드
├── README.md                        # 프로젝트 문서 (이 파일)
├── DEPLOYMENT.md                    # Railway 배포 가이드
├── railway.toml                     # Railway 배포 설정
├── nixpacks.toml                    # Nixpacks 빌드 설정
├── .gitignore
├── .env.local                       # 환경변수 (로컬)
├── .env.example                     # 환경변수 템플릿
├── package.json
├── tsconfig.json
├── bunfig.toml
├── src/
│   ├── index.ts                     # Bun 서버 엔트리포인트 + static file serving
│   ├── db/
│   │   ├── supabase.ts              # Supabase 클라이언트
│   │   ├── schema.sql               # DB 스키마
│   │   ├── seed.ts                  # 데이터 마이그레이션
│   │   └── migrations/
│   │       └── 002_wine_embeddings.sql  # pgvector + 임베딩 테이블
│   ├── api/
│   │   ├── gemini.ts                # Gemini API (Pre-Step, Step 2, 3)
│   │   ├── google-search.ts         # Google Custom Search (Step 1, 4)
│   │   ├── openai.ts                # OpenAI Embeddings API
│   │   ├── cohere.ts                # Cohere Reranker API
│   │   └── wines.ts                 # 와인 관련 서버 로직
│   ├── frontend/
│   │   ├── index.html               # 메인 HTML + Tailwind config
│   │   ├── app.tsx                  # React 루트
│   │   ├── polyfill.js              # Supabase polyfill
│   │   ├── img/                     # Static images
│   │   │   ├── podoring_wms_logo.png
│   │   │   └── podoring_icon.png
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript 타입
│   │   ├── components/
│   │   │   ├── Layout.tsx           # 레이아웃 with logo + tabs
│   │   │   ├── Dashboard.tsx        # 대시보드 with 6 chart sections
│   │   │   ├── WineList.tsx         # 와인 목록
│   │   │   ├── WineCard.tsx         # 와인 카드 with Vivino badge
│   │   │   ├── WineFormModal.tsx    # 와인 폼 + AI 자동 생성
│   │   │   ├── InventoryGrid.tsx    # 재고 그리드 (3:2 ratio cards)
│   │   │   └── InventoryForm.tsx    # 재고 추가
│   │   ├── hooks/
│   │   │   ├── useWines.ts          # 와인 데이터 훅
│   │   │   ├── useInventory.ts      # 재고 데이터 훅 with position locking
│   │   │   ├── useDashboard.ts      # 대시보드 통계 (국가별, 날짜별)
│   │   │   └── useCamera.ts         # 카메라 훅
│   │   └── lib/
│   │       └── supabase.ts          # Supabase 클라이언트
│   └── utils/
│       ├── imageProcessing.ts       # 이미지 처리
│       └── validation.ts            # 유효성 검사
├── data/
│   └── wines.csv                    # 구글 시트 export
└── test-photo-to-wine.ts            # AI 자동 생성 통합 테스트
```

## 🗄️ 데이터베이스 스키마

### wines 테이블 (A-데이터베이스)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | Primary Key |
| title | TEXT | 와인명 |
| points | DECIMAL(3,1) | Vivino 평점 |
| vintage | INTEGER | 생산 연도 |
| type | TEXT | Red/White/Rosé/Sparkling/Dessert wine |
| variety | TEXT | 포도 품종 |
| region_2 | TEXT | 세세부 도시명 |
| region_1 | TEXT | 세부 도시명 |
| province | TEXT | 주, 도 |
| country | TEXT | 생산 국가 |
| winery | TEXT | 와이너리 |
| price | INTEGER | 가격 (원화) |
| abv | DECIMAL(4,2) | 알코올 도수 |
| description | TEXT | 와인 설명 |
| taste | TEXT | 테이스트 노트 (맛) |
| acidity | INTEGER | 산도 (1-5) |
| sweetness | INTEGER | 당도 (1-5) |
| tannin | INTEGER | 탄닌 (1-5) |
| body | INTEGER | 바디감 (1-5) |
| cost_effectiveness | INTEGER | 가성비 (1-5) |
| image | TEXT | 이미지 URL |
| vivino_url | TEXT | Vivino 링크 |
| stock | INTEGER | 재고 수량 (자동 계산) |
| created_at | TIMESTAMPTZ | 생성 시각 |
| updated_at | TIMESTAMPTZ | 수정 시각 |

### inventory 테이블 (B-데이터베이스)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | Primary Key |
| wine_id | BIGINT | FK (wines.id) |
| shelf | TEXT | 선반 (A/B/C) |
| row | INTEGER | 행 (1-8) |
| col | INTEGER | 열 (1-4) |
| created_at | TIMESTAMPTZ | 생성 시각 |

**Unique Constraint**: (shelf, row, col) - 한 위치에 하나의 병만

**Trigger**: inventory INSERT/DELETE 시 wines.stock 자동 업데이트

### wine_embeddings 테이블 (시맨틱 검색용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | Primary Key |
| wine_id | BIGINT | FK (wines.id) UNIQUE |
| embedding | VECTOR(1536) | OpenAI 임베딩 벡터 |
| metadata | JSONB | 와인 정보 스냅샷 |
| created_at | TIMESTAMPTZ | 생성 시각 |
| updated_at | TIMESTAMPTZ | 수정 시각 |

**Index**: HNSW index on embedding (vector_cosine_ops) - 고속 벡터 검색

**RPC Function**: `match_wines(query_embedding, match_threshold, match_count)` - 코사인 유사도 검색

## 🚀 개발 현황

### ✅ 완료된 기능 (Phase 1-10)
- [x] 프로젝트 초기화
- [x] Supabase 데이터베이스 설정
- [x] Bun 서버 구조 (static file serving 포함)
- [x] React 기본 구조
- [x] 데이터 마이그레이션
- [x] 와인 관리 기능 (CRUD, 검색, 필터, A-Z 정렬)
- [x] 재고 관리 기능 (8x4 그리드, 위치 고정, A-Z 정렬)
- [x] 카메라 스캔 기능 (AI 4단계 파이프라인)
- [x] 대시보드 (6개 섹션: 통계, 선반, TOP 5, 타입별, 국가별, 날짜별)
- [x] 스타일링 (Tailwind, Lucide icons, 반응형, 브랜드 컬러)

### 🎯 향후 개선 사항 (Phase 11)
- [ ] 전체 기능 테스트 및 버그 수정

### ✅ Phase 12 완료 - Railway 배포 준비
- [x] Railway CLI 설치
- [x] railway.toml 설정 파일 생성
- [x] nixpacks.toml Bun 빌드 설정
- [x] .env.example 업데이트 (Google Custom Search API 추가)
- [x] DEPLOYMENT.md 배포 가이드 작성

### ✅ Phase 13 완료 - 와인 임베딩 & 시맨틱 검색 (RAG)
- [x] pgvector extension 설정
- [x] wine_embeddings 테이블 생성 (HNSW 인덱스)
- [x] OpenAI API 통합 (text-embedding-3-small)
- [x] 시맨틱 검색 API 엔드포인트 (`/api/search/semantic`, 평균 0.3-0.5초)
- [x] 일괄 임베딩 재생성 API (`/api/embeddings/regenerate`)
- [x] RPC 함수 `match_wines()` 구현 (코사인 유사도)
- [x] **와인 CRUD API 자동화** (POST/PUT/DELETE `/api/wines`)
  - 와인 추가 시 자동 임베딩 생성 (~0.6초)
  - 와인 수정 시 자동 임베딩 재생성
  - 와인 삭제 시 CASCADE로 자동 임베딩 삭제
- [x] 프론트엔드 useWines 훅 업데이트 (Supabase 직접 호출 → 백엔드 API 호출)

### ✅ Phase 14 완료 - Cohere Reranker 통합
- [x] Cohere SDK 설치 (cohere-ai@7.19.0)
- [x] 환경 변수 추가 (COHERE_API_KEY)
- [x] Cohere API 모듈 생성 (`src/api/cohere.ts`)
- [x] 시맨틱 검색 API 수정 (2-Stage Architecture)
  - Stage 1: pgvector로 50개 후보 추출 (threshold: 0.3)
  - Stage 2: Cohere Reranker로 Top 3 정제
- [x] 성능 테스트 완료
  - 응답 시간: ~1.2초 (이전 0.3-0.5초 → +200-300ms)
  - 정확도: 60-70% → 85-95%+ (Cohere 적용)
  - Relevance Score: 0.86-0.99 범위 (높은 신뢰도)

## 🔧 환경 설정

### 필요한 계정
1. **Supabase**: https://supabase.com
2. **Railway**: https://railway.app
3. **Google AI Studio**: https://aistudio.google.com
4. **Google Cloud Console**: https://console.cloud.google.com (Custom Search API)
5. **OpenAI Platform**: https://platform.openai.com (Embeddings API)
6. **Cohere Platform**: https://dashboard.cohere.com (Reranker API)

### 환경변수 (.env.local)

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Gemini API (Pre-Step, Step 2, 3)
GEMINI_API_KEY=AIzaSyXxx...

# Google Custom Search API (Step 1, 4)
GOOGLE_API_KEY=AIzaSyXxx...
GOOGLE_CSE_ID=your_search_engine_id

# OpenAI API (Embeddings)
OPENAI_API_KEY=sk-proj-xxx...

# Cohere API (Reranker)
COHERE_API_KEY=your_cohere_api_key

# Server
PORT=3000
NODE_ENV=development
```

## 💻 개발 시작

```bash
# 1. 의존성 설치
bun install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 실제 키 입력

# 3. Supabase에서 SQL 실행
# - src/db/schema.sql (기본 스키마)
# - src/db/migrations/002_wine_embeddings.sql (pgvector + 임베딩 테이블)

# 4. 데이터 마이그레이션
bun run seed

# 5. 개발 서버 시작
bun run dev

# 6. 와인 임베딩 생성 (최초 1회)
# 터미널에서 아래 명령 실행 (서버가 실행 중인 상태에서)
curl -X POST http://localhost:3000/api/embeddings/regenerate

# 7. 브라우저에서 확인
# http://localhost:3000

# 💡 이후 와인 추가/수정/삭제 시 임베딩 자동 생성/업데이트/삭제
```

## 📦 배포

### Railway 배포

상세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md) 참조

#### 빠른 시작 (Railway CLI)

```bash
# 1. Railway CLI 설치 (macOS)
brew install railway

# 2. 로그인
railway login

# 3. 프로젝트 초기화
railway init

# 4. 환경 변수 설정
railway variables set SUPABASE_URL="your_url"
railway variables set SUPABASE_ANON_KEY="your_key"
railway variables set GEMINI_API_KEY="your_key"
railway variables set GOOGLE_API_KEY="your_key"
railway variables set GOOGLE_CSE_ID="your_cse_id"
railway variables set OPENAI_API_KEY="your_openai_key"
railway variables set COHERE_API_KEY="your_cohere_key"
railway variables set NODE_ENV="production"

# 5. 배포
railway up

# 6. 도메인 생성
railway domain
```

#### GitHub 연동 배포

1. GitHub 저장소에 코드 Push
2. Railway Dashboard에서 "New Project" → "Deploy from GitHub repo"
3. 환경 변수 설정 (Settings → Variables)
4. 자동 배포 완료

**배포 설정 파일**:
- `railway.toml` - Railway 배포 설정 (healthcheck, restart policy)
- `nixpacks.toml` - Bun 런타임 설정
- `.env.example` - 환경 변수 템플릿

## 📊 API 엔드포인트

### AI 자동 생성 시스템

- `POST /api/wines/auto-generate/prestep` - Pre-Step: 이미지 분석 (13-17s)
- `POST /api/wines/auto-generate/step1` - Step 1: Vivino URL 검색 (0.5-0.7s)
- `POST /api/wines/auto-generate/step2` - Step 2: 기본 정보 추출 (27-43s, 7 queries)
- `POST /api/wines/auto-generate/step3` - Step 3: 테이스팅 노트 (12-18s, 4-5 queries)
- `POST /api/wines/auto-generate/step4` - Step 4: 이미지 검색 (0.5-0.7s)

### 와인 CRUD (자동 임베딩 생성/업데이트/삭제)

- `POST /api/wines` - 와인 추가 + 자동 임베딩 생성 (~0.6초)
- `PUT /api/wines?id={id}` - 와인 수정 + 자동 임베딩 재생성
- `DELETE /api/wines?id={id}` - 와인 삭제 + 자동 임베딩 삭제 (CASCADE)

### 시맨틱 검색 (RAG + Cohere Reranker)

- `POST /api/search/semantic` - 자연어 쿼리로 와인 검색 (평균 0.5-0.8초)
  ```json
  {
    "query": "fruity red wine from France",
    "limit": 3
  }
  ```
  **응답 예시 (Cohere Reranker 적용)**:
  ```json
  {
    "success": true,
    "data": {
      "wines": [
        {
          "id": 94,
          "title": "Beaujolais Nouveau",
          "similarity": 0.592467,
          "relevance_score": 0.98571813,
          ...전체 21개 필드
        },
        {
          "id": 81,
          "title": "Beaujolais-Villages Nouveau",
          "similarity": 0.542086,
          "relevance_score": 0.9561454,
          ...전체 21개 필드
        },
        {
          "id": 77,
          "title": "Domaine Vincent Latour Volnay",
          "similarity": 0.522320,
          "relevance_score": 0.8558512,
          ...전체 21개 필드
        }
      ],
      "count": 3
    }
  }
  ```
  **필드 설명**:
  - `similarity`: pgvector 코사인 유사도 (0-1)
  - `relevance_score`: Cohere Reranker 관련성 점수 (0-1, 높을수록 관련성 높음)
  - 전체 와인 정보 (21개 필드) 포함으로 추가 DB 쿼리 불필요

- `POST /api/embeddings/regenerate` - 모든 와인 임베딩 일괄 재생성 (관리자용, 80개 ~60초)

### 성능 지표

#### AI 자동 생성 시스템
| 단계 | 처리 시간 | 쿼리 수 | 설명 |
|------|----------|---------|------|
| Pre-Step | 13-17초 | 0 | 이미지 분석 (Gemini 2.5-flash) |
| Step 1 | 0.5-0.7초 | 1 | Google Search |
| Step 2 | 27-43초 | 7 | Gemini Grounding (최적화) |
| Step 3 | 12-18초 | 4-5 | Gemini Grounding |
| Step 4 | 0.5-0.7초 | 1 | Google Image Search |
| **합계** | **~60초** | **~13개** | **Step 3 & 4 병렬 처리** |

#### 시맨틱 검색 & 임베딩 시스템
| 작업 | 처리 시간 | 정확도 | 설명 |
|------|----------|--------|------|
| 와인 추가 + 임베딩 생성 | ~0.6초 | N/A | OpenAI API 호출 78% |
| 와인 수정 + 임베딩 재생성 | ~0.6초 | N/A | 자동 upsert |
| 와인 삭제 | ~0.1초 | N/A | CASCADE 자동 삭제 |
| 시맨틱 검색 (pgvector만) | 0.3-0.5초 | 60-70% | 쿼리 임베딩 + pgvector 검색 |
| **시맨틱 검색 (+ Cohere)** | **0.5-0.8초** | **85-95%+** | **2-Stage: Retrieval(50) + Reranking(3)** |
| 일괄 임베딩 재생성 (80개) | ~60초 | N/A | 백그라운드 작업 권장 |

## 🎨 UI 구조

### 메인 화면 (탭 구조)
- 📊 대시보드 (6개 섹션 with 차트)
- 🍷 와인 목록 (검색, 필터, A-Z 정렬)
- 📦 재고 관리 (선반별 3:2 비율 그리드)

### 대시보드 레이아웃
```
├── Statistics Cards (3 columns)
│   ├── Total Wines
│   ├── Total Stock
│   └── Low Stock Alert
├── Shelf Status (full width, progress bars)
├── Grid Row 1 (2 columns)
│   ├── Top 5 Wines (with images)
│   └── Wine Type Distribution (Donut chart)
└── Grid Row 2 (2 columns)
    ├── Country Distribution (Horizontal bars)
    └── Date Timeline (Line chart, last 7 days)
```

## 🔍 추후 확장 가능성

### 시맨틱 검색 향상
- [x] **Cohere Reranker 통합 (Phase 14 완료)** - 정확도 85-95%+
- [ ] 한국어 검색 지원 (검색어 번역 레이어 추가)
- [ ] 다국어 임베딩 (multilingual-e5 모델)
- [ ] 검색어 캐싱 (동일 쿼리 재사용)
- [ ] 하이브리드 검색 (키워드 + 시맨틱)

### 기타 기능
- [ ] 다중 매장 지원 (stores 테이블)
- [ ] 입출고 히스토리 (transactions 테이블)
- [ ] 바코드 스캔 (ZXing)
- [ ] 재고 알림 (stock = 0 시)
- [ ] Vivino API 통합 (가격 업데이트)
- [ ] PWA (오프라인 지원)
- [ ] 사용자 인증 (Supabase Auth)
- [ ] 판매 통계 및 분석
- [ ] Excel/CSV 내보내기
- [ ] 라벨 인쇄 기능

## 📄 라이선스

MIT

## 👨‍💻 개발자

Podoring Team
