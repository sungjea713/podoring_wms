import React from 'react'

export function WineList() {
  return (
    <div className="space-y-6">
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="와인명, 품종, 와이너리 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500">
              <option value="">모든 타입</option>
              <option value="Red wine">레드 와인</option>
              <option value="White wine">화이트 와인</option>
              <option value="Rosé wine">로제 와인</option>
              <option value="Sparkling wine">스파클링 와인</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-wine-500 focus:border-wine-500">
              <option value="">모든 국가</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wine List Placeholder */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg">아직 등록된 와인이 없습니다</p>
          <p className="mt-2">위 버튼을 눌러 와인을 추가해보세요</p>
        </div>
      </div>
    </div>
  )
}
