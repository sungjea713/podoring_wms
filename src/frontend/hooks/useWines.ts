import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Wine } from '../types'

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
 * 와인 추가
 */
export function useAddWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (wine: Omit<Wine, 'id' | 'stock' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('wines')
        .insert(wine as any)
        .select()
        .single()

      if (error) throw error
      return data as Wine
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
    },
  })
}

/**
 * 와인 수정
 */
export function useUpdateWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...wine }: Partial<Wine> & { id: number }) => {
      const { data, error } = await (supabase
        .from('wines')
        .update(wine as any) as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Wine
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wines'] })
      queryClient.invalidateQueries({ queryKey: ['wine', data.id] })
    },
  })
}

/**
 * 와인 삭제
 */
export function useDeleteWine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('wines')
        .delete()
        .eq('id', id)

      if (error) throw error
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
