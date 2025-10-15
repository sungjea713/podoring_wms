import type { Wine } from '../types'

interface WineCardProps {
  wine: Wine
  onEdit?: () => void
  onDelete: () => void
}

export function WineCard({ wine, onEdit, onDelete }: WineCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Wine Image */}
      <div className="aspect-w-3 aspect-h-4 bg-gray-100">
        {wine.image ? (
          <img
            src={wine.image}
            alt={wine.title}
            className="w-full h-48 object-contain p-4"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/200x300?text=No+Image'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400">
            🍷
          </div>
        )}
      </div>

      {/* Wine Info */}
      <div className="p-4">
        {/* Title and Vintage */}
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
          {wine.title}
        </h3>
        {wine.vintage && (
          <p className="text-xs text-gray-500 mt-1">{wine.vintage}</p>
        )}

        {/* Winery and Country */}
        <div className="mt-2 text-xs text-gray-600">
          {wine.winery && <p className="truncate">{wine.winery}</p>}
          {wine.country && <p className="truncate">{wine.country}</p>}
        </div>

        {/* Type and Variety */}
        <div className="mt-3 flex flex-wrap gap-1">
          {wine.type && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(wine.type)}`}>
              {wine.type.replace(' wine', '')}
            </span>
          )}
          {wine.variety && (
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 truncate max-w-[120px]">
              {wine.variety}
            </span>
          )}
        </div>

        {/* Price and Rating */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>
            {wine.price && (
              <p className="font-semibold text-gray-900">
                ₩{wine.price.toLocaleString()}
              </p>
            )}
            {wine.points && (
              <p className="text-xs text-yellow-600">
                ⭐ {wine.points}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`font-semibold ${wine.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              재고 {wine.stock}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          {wine.vivino_url && (
            <a
              href={wine.vivino_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-1.5 text-xs text-center bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
              Vivino
            </a>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              수정
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'Red wine':
      return 'bg-red-100 text-red-800'
    case 'White wine':
      return 'bg-yellow-100 text-yellow-800'
    case 'Rosé wine':
      return 'bg-pink-100 text-pink-800'
    case 'Sparkling wine':
      return 'bg-blue-100 text-blue-800'
    case 'Dessert wine':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
