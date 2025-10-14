// Wine 타입 정의
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
  acidity: 1 | 2 | 3 | 4 | 5 | null
  sweetness: 1 | 2 | 3 | 4 | 5 | null
  tannin: 1 | 2 | 3 | 4 | 5 | null
  body: 1 | 2 | 3 | 4 | 5 | null
  cost_effectiveness: 1 | 2 | 3 | 4 | 5 | null
  image: string | null
  vivino_url: string | null
  stock: number
  created_at: string
  updated_at: string
}

// Inventory 타입 정의
export interface Inventory {
  id: number
  wine_id: number
  shelf: 'A' | 'B' | 'C'
  row: number  // 1-8
  col: number  // 1-4
  created_at: string
}

// Inventory 상세 (와인 정보 포함)
export interface InventoryDetail extends Inventory {
  title: string
  vintage: number | null
  type: string | null
  variety: string | null
  winery: string | null
  image: string | null
  price: number | null
  stock: number
}

// 와인 추가/수정 폼 데이터
export type WineFormData = Omit<Wine, 'id' | 'stock' | 'created_at' | 'updated_at'>

// 재고 추가 폼 데이터
export type InventoryFormData = Omit<Inventory, 'id' | 'created_at'>

// Supabase Database 타입
export type Database = {
  public: {
    Tables: {
      wines: {
        Row: Wine
        Insert: Omit<Wine, 'id' | 'stock' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Wine, 'id' | 'created_at'>>
      }
      inventory: {
        Row: Inventory
        Insert: Omit<Inventory, 'id' | 'created_at'>
        Update: Partial<Omit<Inventory, 'id' | 'created_at'>>
      }
    }
    Views: {
      inventory_details: {
        Row: InventoryDetail
      }
    }
  }
}

// Gemini API 응답 타입
export interface GeminiWineAnalysis {
  title: string
  vintage: number | null
  winery: string | null
  variety: string | null
  country: string | null
  region_1: string | null
  abv: number | null
  type: 'Red wine' | 'White wine' | 'Rosé wine' | 'Sparkling wine' | null
  confidence: number
}

// 대시보드 통계 타입
export interface DashboardStats {
  totalWines: number
  totalStock: number
  lowStockWines: number
  shelfStats: {
    [key in 'A' | 'B' | 'C']: {
      current: number
      max: number
      percentage: number
    }
  }
}
