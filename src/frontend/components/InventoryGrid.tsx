import React, { useState } from 'react'

type Shelf = 'A' | 'B' | 'C'

export function InventoryGrid() {
  const [activeShelf, setActiveShelf] = useState<Shelf>('A')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">재고 관리</h2>
        <div className="text-sm text-gray-500">
          선반별 위치: 8행 × 4열
        </div>
      </div>

      {/* Shelf Selector */}
      <div className="bg-white rounded-lg shadow p-4">
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
      <div className="bg-white rounded-lg shadow p-6">
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
                <div key={col} className="w-24 text-center text-sm font-medium text-gray-600">
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

                {/* Cells */}
                {[1, 2, 3, 4].map((col) => (
                  <div
                    key={`${row}-${col}`}
                    className="w-24 h-24 m-1 border-2 border-dashed border-gray-300 rounded-lg
                               flex items-center justify-center cursor-pointer
                               hover:border-wine-400 hover:bg-wine-50 transition-colors"
                  >
                    <span className="text-gray-400 text-xs">빈 칸</span>
                  </div>
                ))}
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
