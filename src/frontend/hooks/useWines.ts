import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wine } from '../types'

// Note: useAddWine, useUpdateWine, useDeleteWine now use backend API
// for automatic embedding generation/update/deletion

/**
 * 와인 목록 조회
 */
export function useWines(filters?: {
  search?: string
  type?: string
  country?: string
  hasStock?: boolean
}) {
  return useQuery({
    queryKey: ['wines', filters],
    queryFn: async () => {
      let query = supabase
        .from('wines')
        .select('*')
        .order('created_at', { ascending: false })

      // 검색 필터
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,variety.ilike.%${filters.search}%,winery.ilike.%${filters.search}%`)
      }

      // 타입 필터
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      // 국가 필터
      if (filters?.country) {
        query = query.eq('country', filters.country)
      }

      // 재고 필터
      if (filters?.hasStock) {
        query = query.gt('stock', 0)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Wine[]
    },
  })
}

/**
 * 단일 와인 조회
 */
export function useWine(id: number) {
  return useQuery({
    queryKey: ['wine', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Wine
    },
    enabled: !!id,
  })
}

/**
 * 와인 추가 (백엔드 API 사용 - 자동 임베딩 생성)
 */
export function useAddWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (wine: Omit<Wine, 'id' | 'stock' | 'created_at' | 'updated_at'>) => {
      const response = await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wine)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add wine')
      }

      const result = await response.json()
      return result.data as Wine
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
  })
}

/**
 * 와인 수정 (백엔드 API 사용 - 자동 임베딩 재생성)
 */
export function useUpdateWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...wine }: Partial<Wine> & { id: number }) => {
      const response = await fetch(`/api/wines?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wine)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update wine')
      }

      const result = await response.json()
      return result.data as Wine
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wine', data.id] })
    },
  })
}

/**
 * 와인 삭제 (백엔드 API 사용 - 임베딩 자동 삭제)
 */
export function useDeleteWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/wines?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete wine')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
  })
}

/**
 * 국가 목록 조회 (필터용)
 */
export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wines')
        .select('country')
        .not('country', 'is', null)
        .order('country') as any

      if (error) throw error

      // 중복 제거
      const countries = [...new Set(data.map((item: any) => item.country))]
      return countries.filter(c => c) as string[]
    },
  })
}
