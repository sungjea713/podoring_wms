import React, { useState } from 'react'
import { useWines, useCountries, useDeleteWine } from '../hooks/useWines'
import { WineCard } from './WineCard'

export function WineList() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [hasStockFilter, setHasStockFilter] = useState(false)

  const { data: wines, isLoading, error } = useWines({
    search,
    type: typeFilter || undefined,
    country: countryFilter || undefined,
    hasStock: hasStockFilter || undefined,
  })

  const { data: countries } = useCountries()
  const deleteWine = useDeleteWine()

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`"${title}" 와인을 삭제하시겠습니까?\n연결된 재고도 함께 삭제됩니다.`)) {
      return
    }

    try {
      await deleteWine.mutateAsync(id)
      alert('와인이 삭제되었습니다.')
    } catch (error) {
      alert('삭제 실패: ' + (error as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">와인 목록</h2>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <span className="mr-2">📷</span>
            사진으로 추가
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-wine-600 hover:bg-wine-700">
            <span className="mr-2">➕</span>
            수동 추가
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="와인명, 품종, 와이너리 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500"
            />
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500"
            >
              <option value="">모든 타입</option>
              <option value="Red wine">레드 와인</option>
              <option value="White wine">화이트 와인</option>
              <option value="Rosé wine">로제 와인</option>
              <option value="Sparkling wine">스파클링 와인</option>
              <option value="Dessert wine">디저트 와인</option>
            </select>
          </div>

          {/* Country Filter */}
          <div className="md:col-span-2">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500"
            >
              <option value="">모든 국가</option>
              {countries?.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="md:col-span-3 flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasStockFilter}
                onChange={(e) => setHasStockFilter(e.target.checked)}
                className="w-4 h-4 text-wine-600 border-gray-300 rounded focus:ring-wine-500"
              />
              <span className="text-sm text-gray-700">재고 있는 와인만</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {wines && (
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{wines.length}</span>개의 와인
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600"></div>
          <p className="mt-4 text-gray-600">와인 목록을 불러오는 중...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ❌ 와인 목록을 불러오는데 실패했습니다: {(error as Error).message}
          </p>
        </div>
      )}

      {/* Empty State */}
      {wines && wines.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <p className="text-lg">검색 결과가 없습니다</p>
          <p className="mt-2">다른 조건으로 검색해보세요</p>
        </div>
      )}

      {/* Wine Grid */}
      {wines && wines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wines.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              onDelete={() => handleDelete(wine.id, wine.title)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
