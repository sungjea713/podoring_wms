import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface DashboardStats {
  totalWines: number
  totalStock: number
  lowStockWines: number
  shelfStats: {
    A: { count: number; max: number; percentage: number }
    B: { count: number; max: number; percentage: number }
    C: { count: number; max: number; percentage: number }
  }
  topWines: Array<{
    id: number
    title: string
    winery: string
    stock: number
    image: string | null
  }>
  winesByType: {
    type: string
    count: number
  }[]
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // 1. 총 와인 종류 및 총 재고
      const { data: wines, error: winesError } = await supabase
        .from('wines')
        .select('id, title, winery, stock, type, image')

      if (winesError) throw winesError

      const totalWines = wines.length
      const totalStock = wines.reduce((sum, wine) => sum + (wine.stock || 0), 0)
      const lowStockWines = wines.filter((wine) => wine.stock > 0 && wine.stock <= 2).length

      // 2. 타입별 와인 수
      const typeCount: Record<string, number> = {}
      wines.forEach((wine) => {
        const type = wine.type || 'Unknown'
        typeCount[type] = (typeCount[type] || 0) + 1
      })

      const winesByType = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count
      }))

      // 3. 재고 많은 와인 TOP 5
      const topWines = wines
        .filter((wine) => wine.stock > 0)
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 5)
        .map((wine) => ({
          id: wine.id,
          title: wine.title,
          winery: wine.winery || '',
          stock: wine.stock,
          image: wine.image
        }))

      // 4. 선반별 재고 현황 (최대: 8행 x 4열 = 32칸)
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('shelf')

      if (invError) throw invError

      const maxPerShelf = 32 // 8행 x 4열
      const shelfCount = {
        A: inventory.filter((i) => i.shelf === 'A').length,
        B: inventory.filter((i) => i.shelf === 'B').length,
        C: inventory.filter((i) => i.shelf === 'C').length
      }

      const shelfStats = {
        A: {
          count: shelfCount.A,
          max: maxPerShelf,
          percentage: Math.round((shelfCount.A / maxPerShelf) * 100)
        },
        B: {
          count: shelfCount.B,
          max: maxPerShelf,
          percentage: Math.round((shelfCount.B / maxPerShelf) * 100)
        },
        C: {
          count: shelfCount.C,
          max: maxPerShelf,
          percentage: Math.round((shelfCount.C / maxPerShelf) * 100)
        }
      }

      return {
        totalWines,
        totalStock,
        lowStockWines,
        shelfStats,
        topWines,
        winesByType
      }
    },
    refetchInterval: 10000 // 10초마다 자동 갱신
  })
}
