import { useDashboardStats } from '../hooks/useDashboard'

export function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
        <div className="text-center py-12">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return <div>데이터를 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
        <div className="text-sm text-gray-500">
          10초마다 자동 갱신
        </div>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon="🍷"
          title="총 와인 종류"
          value={stats.totalWines.toString()}
          description="등록된 와인"
        />
        <StatCard
          icon="📦"
          title="총 재고"
          value={stats.totalStock.toString()}
          description="병"
        />
        <StatCard
          icon="⚠️"
          title="재고 부족"
          value={stats.lowStockWines.toString()}
          description="와인 (재고 ≤ 2)"
        />
      </div>

      {/* 선반별 재고 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          선반별 재고 현황
        </h3>
        <div className="space-y-4">
          {(['A', 'B', 'C'] as const).map((shelf) => (
            <div key={shelf}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  선반 {shelf}
                </span>
                <span className="text-sm text-gray-500">
                  {stats.shelfStats[shelf].count} / {stats.shelfStats[shelf].max} 칸
                  ({stats.shelfStats[shelf].percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    stats.shelfStats[shelf].percentage > 80
                      ? 'bg-red-500'
                      : stats.shelfStats[shelf].percentage > 50
                      ? 'bg-yellow-500'
                      : 'bg-wine-600'
                  }`}
                  style={{ width: `${stats.shelfStats[shelf].percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 재고 많은 와인 TOP 5 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            재고 TOP 5
          </h3>
          {stats.topWines.length > 0 ? (
            <div className="space-y-3">
              {stats.topWines.map((wine, index) => (
                <div
                  key={wine.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-wine-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  {wine.image && (
                    <div className="flex-shrink-0 w-10 h-10 ml-3 flex items-center justify-center">
                      <img
                        src={wine.image}
                        alt={wine.title}
                        className="h-full w-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {wine.title}
                    </div>
                    <div className="text-xs text-gray-500">{wine.winery}</div>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-lg font-bold text-wine-600">
                    {wine.stock}병
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">재고가 있는 와인이 없습니다.</p>
          )}
        </div>

        {/* 타입별 와인 분포 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            타입별 와인 분포
          </h3>
          <div className="flex flex-col items-center">
            {/* 도넛 차트 */}
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  let currentAngle = 0
                  return stats.winesByType.map((item) => {
                    const percentage = item.count / stats.totalWines
                    const angle = percentage * 360
                    const startAngle = currentAngle
                    currentAngle += angle

                    // SVG path 계산
                    const radius = 40
                    const innerRadius = 25
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = ((startAngle + angle) * Math.PI) / 180

                    const x1 = 50 + radius * Math.cos(startRad)
                    const y1 = 50 + radius * Math.sin(startRad)
                    const x2 = 50 + radius * Math.cos(endRad)
                    const y2 = 50 + radius * Math.sin(endRad)
                    const x3 = 50 + innerRadius * Math.cos(endRad)
                    const y3 = 50 + innerRadius * Math.sin(endRad)
                    const x4 = 50 + innerRadius * Math.cos(startRad)
                    const y4 = 50 + innerRadius * Math.sin(startRad)

                    const largeArc = angle > 180 ? 1 : 0

                    const pathData = [
                      `M ${x1} ${y1}`,
                      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                      `L ${x3} ${y3}`,
                      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                      'Z'
                    ].join(' ')

                    const color =
                      item.type === 'Red wine' ? '#ef4444' :
                      item.type === 'White wine' ? '#eab308' :
                      item.type === 'Rosé wine' ? '#ec4899' :
                      item.type === 'Sparkling wine' ? '#3b82f6' :
                      '#6b7280'

                    return (
                      <path
                        key={item.type}
                        d={pathData}
                        fill={color}
                        className="hover:opacity-80 transition-opacity"
                      />
                    )
                  })
                })()}
              </svg>
              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900">
                  {stats.totalWines}
                </div>
                <div className="text-xs text-gray-500">총 와인</div>
              </div>
            </div>

            {/* 범례 */}
            <div className="w-full space-y-2">
              {stats.winesByType.map((item) => {
                const percentage = Math.round((item.count / stats.totalWines) * 100)
                const color =
                  item.type === 'Red wine' ? 'bg-red-500' :
                  item.type === 'White wine' ? 'bg-yellow-500' :
                  item.type === 'Rosé wine' ? 'bg-pink-500' :
                  item.type === 'Sparkling wine' ? 'bg-blue-500' :
                  'bg-gray-500'

                return (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
                      <span className="text-sm text-gray-700">{item.type}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {item.count}개 ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: string
  title: string
  value: string
  description: string
}

function StatCard({ icon, title, value, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-4xl">{icon}</span>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              <div className="ml-2 text-sm text-gray-500">
                {description}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
