import type { Wine } from '../types'

interface WineCardProps {
  wine: Wine
  onEdit?: () => void
  onDelete: () => void
}

export function WineCard({ wine, onEdit, onDelete }: WineCardProps) {
  return (
    <div className="bg-[#F4F2EF] rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
      {/* Wine Image */}
      <div className="aspect-w-3 aspect-h-4 bg-gray-100 relative">
        {wine.image ? (
          <img
            src={wine.image}
            alt={wine.title}
            className="w-full h-32 sm:h-48 object-contain p-2 sm:p-4"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/200x300?text=No+Image'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-32 sm:h-48 text-gray-400 text-2xl sm:text-4xl">
            🍷
          </div>
        )}
        {/* Stock badge */}
        <div className={`absolute top-1 sm:top-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg ${wine.stock > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {wine.stock}
        </div>
      </div>

      {/* Wine Info */}
      <div className="p-2 sm:p-4">
        {/* Title and Vintage */}
        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 min-h-[1.8rem] sm:min-h-[2.5rem] leading-tight">
          {wine.title}
        </h3>
        {wine.vintage && (
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{wine.vintage}</p>
        )}

        {/* Winery and Country */}
        <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600">
          {wine.winery && <p className="truncate">{wine.winery}</p>}
          {wine.country && <p className="truncate">{wine.country}</p>}
        </div>

        {/* Type and Variety */}
        <div className="mt-2 sm:mt-3 flex flex-wrap gap-0.5 sm:gap-1">
          {wine.type && (
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${getTypeColor(wine.type)}`}>
              {wine.type.replace(' wine', '')}
            </span>
          )}
          {wine.variety && (
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-700 truncate max-w-[100px] sm:max-w-[120px]">
              {wine.variety}
            </span>
          )}
        </div>

        {/* Price and Rating */}
        <div className="mt-2 sm:mt-3 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex-1">
            {wine.price && (
              <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                ₩{wine.price.toLocaleString()}
              </p>
            )}
            {wine.points && (
              <div className="flex items-center gap-1 mt-1">
                <img
                  src="https://vectorseek.com/wp-content/uploads/2023/10/Vivino-Logo-Vector.svg-.png"
                  alt="Vivino"
                  className="h-[10px] sm:h-[14px] w-auto object-contain"
                />
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {wine.points}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 sm:mt-4 flex gap-1 sm:gap-2">
          {wine.vivino_url && (
            <a
              href={wine.vivino_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-center bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
            >
              Vivino
            </a>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors font-medium"
            >
              수정
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-medium"
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
