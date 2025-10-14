# 🍷 Podoring WMS - Wine Management System

와인 재고 관리 시스템 with AI-powered Wine Label Recognition

## 📋 프로젝트 개요

고객사 와인 매장의 재고를 효율적으로 관리하기 위한 웹 애플리케이션입니다.

### 주요 기능

1. **와인 관리** (A-데이터베이스)
   - 와인 정보 CRUD (추가, 수정, 삭제, 조회)
   - 검색, 필터링, 정렬
   - 21개 필드: 와인명, 빈티지, 품종, 국가, 가격, 평점, 테이스트 노트 등

2. **재고 관리** (B-데이터베이스)
   - 선반별 그리드 뷰 (A/B/C, 각 8행x4열 = 32병)
   - 재고 위치 추적 (선반, 행, 열)
   - 실시간 재고 수량 자동 계산

3. **AI 카메라 스캔**
   - 모바일 카메라로 와인 라벨 촬영
   - Gemini API로 자동 정보 추출 (와인명, 빈티지, 품종 등)
   - 수정 가능한 폼으로 결과 제공

4. **대시보드**
   - 총 와인 종류 수
   - 총 재고 병 수
   - 선반별 재고 현황
   - 재고 부족 와인 목록

## 🏗️ 기술 스택

### Backend
- **Runtime**: Bun 1.x
- **Server**: Bun.serve() (WebSocket, routes)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 1.5 Flash

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS (CDN)
- **State Management**: @tanstack/react-query
- **Build**: Bun's built-in bundler

### Deployment
- **Server**: Railway
- **Database**: Supabase Cloud

## 📂 프로젝트 구조

```
podoring_wms/
├── CLAUDE.md                        # Bun 개발 가이드
├── README.md                        # 프로젝트 문서 (이 파일)
├── .gitignore
├── .env.local                       # 환경변수 (로컬)
├── .env.example                     # 환경변수 템플릿
├── package.json
├── tsconfig.json
├── bunfig.toml
├── src/
│   ├── index.ts                     # Bun 서버 엔트리포인트
│   ├── db/
│   │   ├── supabase.ts              # Supabase 클라이언트
│   │   ├── schema.sql               # DB 스키마
│   │   └── seed.ts                  # 데이터 마이그레이션
│   ├── api/
│   │   ├── gemini.ts                # Gemini API 클라이언트
│   │   └── wines.ts                 # 와인 관련 서버 로직
│   ├── frontend/
│   │   ├── index.html               # 메인 HTML
│   │   ├── app.tsx                  # React 루트
│   │   ├── styles.css               # Tailwind CSS
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript 타입
│   │   ├── components/
│   │   │   ├── Layout.tsx           # 레이아웃
│   │   │   ├── Dashboard.tsx        # 대시보드
│   │   │   ├── WineList.tsx         # 와인 목록
│   │   │   ├── WineCard.tsx         # 와인 카드
│   │   │   ├── WineForm.tsx         # 와인 폼
│   │   │   ├── WineScanner.tsx      # 카메라 스캔
│   │   │   ├── InventoryGrid.tsx    # 재고 그리드
│   │   │   └── InventoryForm.tsx    # 재고 추가
│   │   └── hooks/
│   │       ├── useWines.ts          # 와인 데이터 훅
│   │       ├── useInventory.ts      # 재고 데이터 훅
│   │       └── useCamera.ts         # 카메라 훅
│   └── utils/
│       ├── imageProcessing.ts       # 이미지 처리
│       └── validation.ts            # 유효성 검사
└── data/
    └── wines.csv                    # 구글 시트 export
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

### inventory_details 뷰

```sql
SELECT
  i.id, i.wine_id, i.shelf, i.row, i.col,
  w.title, w.vintage, w.type, w.variety, w.winery, w.image, w.price,
  i.created_at
FROM inventory i
JOIN wines w ON i.wine_id = w.id
```

## 🚀 구현 단계 (12 Phases)

### Phase 1: 프로젝트 초기화 (5분)
- [x] CLAUDE.md, README.md
- [x] package.json, tsconfig.json
- [x] .gitignore, .env.local, .env.example
- [x] bun install

### Phase 2: Supabase 데이터베이스 설정 (10분)
- [ ] schema.sql 실행 (Supabase SQL Editor)
- [ ] 테이블 생성 확인
- [ ] src/db/supabase.ts

### Phase 3: Bun 서버 기본 구조 (10분)
- [ ] src/index.ts (Bun.serve)
- [ ] src/api/gemini.ts
- [ ] src/frontend/index.html
- [ ] src/frontend/types/index.ts

### Phase 4: React 기본 구조 (15분)
- [ ] src/frontend/app.tsx
- [ ] src/frontend/components/Layout.tsx
- [ ] 빈 컴포넌트 (Dashboard, WineList, InventoryGrid)

### Phase 5: 데이터 마이그레이션 (15분)
- [ ] 구글 시트 CSV 다운로드
- [ ] src/db/seed.ts
- [ ] bun run seed 실행

### Phase 6: 와인 관리 기능 (60분)
- [ ] hooks/useWines.ts
- [ ] WineList.tsx (목록, 검색, 필터)
- [ ] WineCard.tsx
- [ ] WineForm.tsx (추가/수정)

### Phase 7: 재고 관리 기능 (60분)
- [ ] hooks/useInventory.ts
- [ ] InventoryGrid.tsx (8x4 그리드)
- [ ] InventoryForm.tsx

### Phase 8: 카메라 스캔 기능 (60분)
- [ ] WineScanner.tsx
- [ ] hooks/useCamera.ts
- [ ] /api/wines/scan 엔드포인트

### Phase 9: 대시보드 (30분)
- [ ] Dashboard.tsx
- [ ] 통계 계산

### Phase 10: 스타일링 (30분)
- [ ] Tailwind CSS 세부 조정
- [ ] 반응형 디자인

### Phase 11: 테스트 (20분)
- [ ] 전체 기능 테스트
- [ ] 버그 수정

### Phase 12: 배포 (20분)
- [ ] GitHub push
- [ ] Railway 배포

## 🔧 환경 설정

### 필요한 계정
1. **Supabase**: https://supabase.com
2. **Railway**: https://railway.app
3. **Google AI Studio**: https://aistudio.google.com

### 환경변수 (.env.local)

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Gemini API
GEMINI_API_KEY=AIzaSyXxx...

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

# 3. Supabase에서 schema.sql 실행

# 4. 데이터 마이그레이션
bun run seed

# 5. 개발 서버 시작
bun run dev

# 6. 브라우저에서 확인
# http://localhost:3000
```

## 📦 배포

### Railway 배포

```bash
# 1. GitHub에 푸시
git add .
git commit -m "Initial commit"
git push origin main

# 2. Railway에서 프로젝트 생성
- New Project → Deploy from GitHub repo
- 저장소 선택: podoring_wms

# 3. 환경변수 설정 (Railway Dashboard)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- GEMINI_API_KEY
- NODE_ENV=production

# 4. 자동 배포 완료
```

## 📊 API 엔드포인트

### POST /api/wines/scan
와인 라벨 이미지를 Gemini API로 분석

**Request:**
```typescript
FormData {
  image: File  // JPEG/PNG
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    title: string
    vintage: number
    winery: string
    variety: string
    country: string
    region_1: string
    abv: number
    type: string
    confidence: number
  }
  error?: string
}
```

## 🎨 UI 구조

### 메인 화면 (탭 구조)
- 📊 대시보드
- 🍷 와인 목록
- 📦 재고 관리

### 와인 목록 페이지
- 검색바
- 필터 (타입, 국가, 재고 유무)
- 정렬 (이름, 평점, 가격, 재고)
- 와인 카드 그리드
- [📷 사진으로 추가] [➕ 수동 추가] 버튼

### 재고 관리 페이지
- 선반 선택 탭 (A/B/C)
- 8행 x 4열 그리드
- 클릭: 빈 칸 → 와인 추가 / 와인 → 정보 표시 + 제거

### 대시보드
- 통계 카드 (총 와인, 총 재고, 부족 와인)
- 선반별 재고 차트
- 최근 추가 와인

## 🔍 추후 확장 가능성

- [ ] 다중 매장 지원 (stores 테이블)
- [ ] 입출고 히스토리 (transactions 테이블)
- [ ] 바코드 스캔 (ZXing)
- [ ] 재고 알림 (stock = 0 시)
- [ ] Vivino API 통합 (가격 업데이트)
- [ ] PWA (오프라인 지원)
- [ ] 사용자 인증 (Supabase Auth)
- [ ] 판매 통계 및 분석

## 📄 라이선스

MIT

## 👨‍💻 개발자

Podoring Team
