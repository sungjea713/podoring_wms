import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Inventory } from '../types'

// 전체 인벤토리 조회
export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          wine:wines (
            id,
            title,
            vintage,
            winery,
            type,
            image
          )
        `)
        .order('shelf')
        .order('row')
        .order('col')

      if (error) throw error
      return data
    }
  })
}

// 특정 선반의 인벤토리 조회
export function useInventoryByShelf(shelf: 'A' | 'B' | 'C') {
  return useQuery({
    queryKey: ['inventory', shelf],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          wine:wines (
            id,
            title,
            vintage,
            winery,
            type,
            image
          )
        `)
        .eq('shelf', shelf)
        .order('row')
        .order('col')

      if (error) throw error
      return data
    }
  })
}

// 와인을 인벤토리에 추가
export function useAddToInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inventory: Omit<Inventory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('inventory')
        .insert(inventory as any)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    }
  })
}

// 인벤토리에서 제거
export function useRemoveFromInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    }
  })
}

// 특정 위치의 인벤토리 조회
export function useInventoryByPosition(shelf: string, row: number, col: number) {
  return useQuery({
    queryKey: ['inventory', shelf, row, col],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          wine:wines (
            id,
            title,
            vintage,
            winery,
            type,
            image
          )
        `)
        .eq('shelf', shelf)
        .eq('row', row)
        .eq('col', col)
        .maybeSingle()

      if (error) throw error
      return data
    }
  })
}

// 재고가 있는 모든 위치 조회 (맵 형식)
export function useInventoryMap() {
  return useQuery({
    queryKey: ['inventory', 'map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          wine:wines (
            id,
            title,
            vintage,
            winery,
            type,
            image
          )
        `)
        .order('shelf', { ascending: true })
        .order('row', { ascending: true })
        .order('col', { ascending: true })

      if (error) throw error

      // 위치별 맵 생성
      const map: Record<string, any> = {}
      data?.forEach((item: any) => {
        const key = `${item.shelf}-${item.row}-${item.col}`
        map[key] = item
      })

      return map
    },
    // 캐시를 5초간 유지하여 불필요한 재조회 방지
    staleTime: 5000,
  })
}
