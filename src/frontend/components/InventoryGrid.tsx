import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useInventoryMap, useRemoveFromInventory, useAddToInventory } from '../hooks/useInventory'
import { useWines } from '../hooks/useWines'

type Shelf = 'A' | 'B' | 'C'

// 국가별 깃발 이모지 매핑
function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Portugal': '🇵🇹',
    'Germany': '🇩🇪',
    'Austria': '🇦🇹',
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Chile': '🇨🇱',
    'Argentina': '🇦🇷',
    'South Africa': '🇿🇦',
    'Greece': '🇬🇷',
    'Hungary': '🇭🇺',
    'Canada': '🇨🇦',
    'Israel': '🇮🇱',
    'Lebanon': '🇱🇧',
    'Georgia': '🇬🇪',
    'Croatia': '🇭🇷',
    'Slovenia': '🇸🇮',
    'Bulgaria': '🇧🇬',
    'Romania': '🇷🇴',
    'Moldova': '🇲🇩',
    'Switzerland': '🇨🇭',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'UK': '🇬🇧',
    'United Kingdom': '🇬🇧',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Uruguay': '🇺🇾',
    'Mexico': '🇲🇽',
  }

  return flagMap[country] || '🌍'
}

export function InventoryGrid() {
  const [activeShelf, setActiveShelf] = useState<Shelf>('A')
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [showWineSelector, setShowWineSelector] = useState(false)

  const { data: inventoryMap, isLoading } = useInventoryMap()
  const { data: wines } = useWines({})
  const removeFromInventory = useRemoveFromInventory()

  const handleCellClick = (row: number, col: number) => {
    const key = `${activeShelf}-${row}-${col}`
    const item = inventoryMap?.[key]

    if (item) {
      // 이미 와인이 있는 경우 - 정보 표시 및 제거 옵션
      if (confirm(`${item.wine.title} (${item.wine.vintage})\n\n이 위치에서 제거하시겠습니까?`)) {
        removeFromInventory.mutate(item.id)
      }
    } else {
      // 빈 칸인 경우 - 와인 선택 모달 열기
      setSelectedCell({ row, col })
      setShowWineSelector(true)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">재고 관리</h2>
        <div className="text-sm text-gray-500">
          선반별 위치: 8행 × 4열
        </div>
      </div>

      {/* Shelf Selector */}
      <div className="bg-[#F4F2EF] rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <ShelfButton
            shelf="A"
            active={activeShelf === 'A'}
            onClick={() => setActiveShelf('A')}
          />
          <ShelfButton
            shelf="B"
            active={activeShelf === 'B'}
            onClick={() => setActiveShelf('B')}
          />
          <ShelfButton
            shelf="C"
            active={activeShelf === 'C'}
            onClick={() => setActiveShelf('C')}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="bg-[#F4F2EF] rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            선반 {activeShelf}
          </h3>
          <p className="text-sm text-gray-500">
            빈 칸 클릭: 와인 추가 | 와인 클릭: 정보 및 제거
          </p>
        </div>

        {/* Grid: 8행 x 4열 */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Column Headers */}
            <div className="flex mb-2">
              <div className="w-16"></div>
              {[1, 2, 3, 4].map((col) => (
                <div key={col} className="w-36 text-center text-sm font-medium text-gray-600 mx-1">
                  열 {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
              <div key={row} className="flex mb-2">
                {/* Row Label */}
                <div className="w-16 flex items-center justify-center text-sm font-medium text-gray-600">
                  {row}행
                </div>

                {/* Cells - 3:2 비율 (144px × 96px) */}
                {[1, 2, 3, 4].map((col) => {
                  const key = `${activeShelf}-${row}-${col}`
                  const item = inventoryMap?.[key]

                  return (
                    <div
                      key={`${row}-${col}`}
                      onClick={() => handleCellClick(row, col)}
                      className={`
                        w-36 h-24 m-1 rounded-lg cursor-pointer transition-all
                        flex items-center justify-start p-2
                        ${item
                          ? 'border-2 border-wine-400 bg-wine-50 hover:bg-wine-100'
                          : 'border-2 border-dashed border-gray-300 hover:border-wine-400 hover:bg-wine-50'
                        }
                      `}
                    >
                      {item ? (
                        <>
                          {/* 이미지 - 왼쪽 */}
                          {item.wine.image && (
                            <div className="w-12 h-20 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden">
                              <img
                                src={item.wine.image}
                                alt={item.wine.title}
                                className="h-full w-auto object-contain"
                              />
                            </div>
                          )}
                          {/* 텍스트 정보 - 오른쪽 */}
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <span className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-tight mb-0.5">
                              {item.wine.title}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {item.wine.vintage}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs w-full text-center">빈 칸</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-dashed border-gray-300 rounded mr-2"></div>
              <span className="text-gray-600">빈 칸</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-wine-100 border-2 border-wine-400 rounded mr-2"></div>
              <span className="text-gray-600">와인 있음</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wine Selector Modal */}
      {showWineSelector && selectedCell && (
        <WineSelectorModal
          shelf={activeShelf}
          row={selectedCell.row}
          col={selectedCell.col}
          wines={wines || []}
          onClose={() => {
            setShowWineSelector(false)
            setSelectedCell(null)
          }}
        />
      )}
    </div>
  )
}

interface ShelfButtonProps {
  shelf: Shelf
  active: boolean
  onClick: () => void
}

function ShelfButton({ shelf, active, onClick }: ShelfButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-8 py-3 rounded-lg font-medium transition-colors
        ${active
          ? 'bg-wine-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      선반 {shelf}
    </button>
  )
}

interface WineSelectorModalProps {
  shelf: Shelf
  row: number
  col: number
  wines: any[]
  onClose: () => void
}

function WineSelectorModal({ shelf, row, col, wines, onClose }: WineSelectorModalProps) {
  const [search, setSearch] = useState('')
  const addToInventory = useAddToInventory()

  const filteredWines = wines
    .filter((wine) =>
      wine.title.toLowerCase().includes(search.toLowerCase()) ||
      wine.winery?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))

  const handleSelectWine = async (wineId: number) => {
    try {
      await addToInventory.mutateAsync({
        wine_id: wineId,
        shelf,
        row,
        col
      })
      onClose()
    } catch (error: any) {
      if (error.message?.includes('unique_location') || error.message?.includes('duplicate')) {
        alert(`이미 선반 ${shelf} - ${row}행 ${col}열에 와인이 있습니다.\n먼저 기존 와인을 제거해주세요.`)
      } else {
        alert('와인 추가 실패: ' + error.message)
      }
    }
  }

  const modalContent = (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              와인 선택: 선반 {shelf} - {row}행 {col}열
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="와인 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
          />
        </div>

        {/* Wine List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {filteredWines.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {search ? '검색 결과가 없습니다' : '등록된 와인이 없습니다'}
              </p>
            ) : (
              filteredWines.map((wine) => (
                <div
                  key={wine.id}
                  onClick={() => handleSelectWine(wine.id)}
                  className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:bg-wine-50 hover:border-wine-400 cursor-pointer transition-all shadow-sm hover:shadow-md"
                >
                  {/* 와인 이미지 */}
                  <div className="flex-shrink-0 mr-4">
                    {wine.image ? (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg shadow overflow-hidden flex items-center justify-center">
                        <img
                          src={wine.image}
                          alt={wine.title}
                          className="h-full w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* 와인 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-lg mb-1">
                      {wine.title}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {wine.winery} · {wine.vintage}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        wine.type === 'Red' ? 'bg-red-100 text-red-700' :
                        wine.type === 'White' ? 'bg-yellow-100 text-yellow-700' :
                        wine.type === 'Rose' ? 'bg-pink-100 text-pink-700' :
                        wine.type === 'Sparkling' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {wine.type}
                      </span>
                      {wine.variety && (
                        <>
                          <span>·</span>
                          <span>{wine.variety}</span>
                        </>
                      )}
                    </div>
                    {wine.country && (
                      <div className="text-sm text-gray-500">
                        {getCountryFlag(wine.country)} {wine.country}{wine.region ? ` · ${wine.region}` : ''}
                      </div>
                    )}
                  </div>

                  {/* 재고 정보 */}
                  <div className="flex-shrink-0 text-right ml-4">
                    <div className="text-lg font-bold text-wine-600">
                      재고: {wine.stock || 0}
                    </div>
                    {wine.price > 0 && (
                      <div className="text-sm text-gray-500">
                        {wine.price.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
