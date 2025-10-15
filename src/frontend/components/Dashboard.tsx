import { Wine, Package, AlertTriangle } from 'lucide-react'
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">대시보드</h2>
        <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
          10초마다 자동 갱신
        </div>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-6">
        <StatCard
          icon={<Wine className="w-8 h-8 sm:w-10 sm:h-10" />}
          title="총 와인 종류"
          value={stats.totalWines.toString()}
          description="등록된 와인"
        />
        <StatCard
          icon={<Package className="w-8 h-8 sm:w-10 sm:h-10" />}
          title="총 재고"
          value={stats.totalStock.toString()}
          description="병"
        />
        <StatCard
          icon={<AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />}
          title="재고 부족"
          value={stats.lowStockWines.toString()}
          description="와인 (재고 ≤ 2)"
        />
      </div>

      {/* 선반별 재고 현황 */}
      <div className="bg-[#F4F2EF] rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          선반별 재고 현황
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {(['A', 'B', 'C'] as const).map((shelf) => (
            <div key={shelf}>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  선반 {shelf}
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {stats.shelfStats[shelf].count} / {stats.shelfStats[shelf].max} 칸
                  <span className="hidden sm:inline">
                    {' '}({stats.shelfStats[shelf].percentage}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all ${
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 재고 많은 와인 TOP 5 */}
        <div className="bg-[#F4F2EF] rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            재고 TOP 5
          </h3>
          {stats.topWines.length > 0 ? (
            <div className="space-y-3">
              {stats.topWines.map((wine, index) => (
                <div
                  key={wine.id}
                  className="flex items-center p-3 bg-[#E6E7EB] rounded-lg"
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
        <div className="bg-[#F4F2EF] rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            타입별 와인 분포
          </h3>
          <div className="flex flex-col items-center">
            {/* 도넛 차트 */}
            <div className="relative w-56 h-56 mb-6">
              {/* 배경 그림자 원 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 opacity-30"></div>

              <svg viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-lg">
                {(() => {
                  let currentAngle = 0
                  return stats.winesByType.map((item, index) => {
                    const percentage = item.count / stats.totalWines
                    const angle = percentage * 360
                    const startAngle = currentAngle
                    currentAngle += angle

                    // SVG path 계산
                    const radius = 45
                    const innerRadius = 32
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

                    // 세련된 와인 컬러 팔레트 (중간 톤)
                    const color =
                      item.type === 'Red wine' ? '#B05B6C' :
                      item.type === 'White wine' ? '#D4B97A' :
                      item.type === 'Rosé wine' ? '#E8B5B5' :
                      item.type === 'Sparkling wine' ? '#7A9FBF' :
                      item.type === 'Dessert wine' ? '#C89158' :
                      '#9B9B8A'

                    return (
                      <g key={item.type}>
                        <path
                          d={pathData}
                          fill={color}
                          className="hover:opacity-90 transition-all duration-300 cursor-pointer"
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                          }}
                        />
                      </g>
                    )
                  })
                })()}
              </svg>

              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold bg-gradient-to-br from-wine-600 to-wine-800 bg-clip-text text-transparent">
                  {stats.totalWines}
                </div>
                <div className="text-sm text-gray-600 font-medium mt-1">총 와인</div>
              </div>
            </div>

            {/* 범례 */}
            <div className="w-full space-y-3">
              {stats.winesByType.map((item) => {
                const percentage = Math.round((item.count / stats.totalWines) * 100)

                // 도넛 차트와 동일한 색상
                const color =
                  item.type === 'Red wine' ? '#B05B6C' :
                  item.type === 'White wine' ? '#D4B97A' :
                  item.type === 'Rosé wine' ? '#E8B5B5' :
                  item.type === 'Sparkling wine' ? '#7A9FBF' :
                  item.type === 'Dessert wine' ? '#C89158' :
                  '#9B9B8A'

                return (
                  <div key={item.type} className="flex items-center justify-between bg-white/50 rounded-lg p-2 hover:bg-white/80 transition-all">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3 shadow-sm"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-800">{item.type}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count}개 ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 국가별 와인 분포 */}
        <div className="bg-[#F4F2EF] rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            국가별 와인 분포
          </h3>
          <div className="space-y-3">
            {stats.winesByCountry.map((item) => {
              const maxCount = Math.max(...stats.winesByCountry.map(c => c.count))
              const percentage = (item.count / maxCount) * 100

              return (
                <div key={item.country} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{item.country}</span>
                    <span className="text-gray-600">{item.count}개</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-wine-600 to-wine-700 transition-all duration-500 shadow-sm"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 날짜별 와인 추가 통계 */}
        <div className="bg-[#F4F2EF] rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            날짜별 와인 추가 현황 (최근 7일)
          </h3>
          <div className="relative h-64">
            {stats.winesByDate && stats.winesByDate.length > 0 ? (
              <svg viewBox="0 0 700 200" className="w-full h-full">
                {/* 그라데이션 정의 */}
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#A80569" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A80569" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {(() => {
                  const maxCount = Math.max(...stats.winesByDate.map(d => d.count), 1)
                  const padding = 40
                  const chartHeight = 200 - padding * 2
                  const chartWidth = 700 - padding * 2
                  const pointSpacing = chartWidth / (stats.winesByDate.length - 1)

                  // 포인트 계산
                  const points = stats.winesByDate.map((item, index) => {
                    const x = padding + index * pointSpacing
                    const y = padding + chartHeight - (item.count / maxCount) * chartHeight
                    return { x, y, ...item }
                  })

                  // 꺾은선 경로
                  const linePath = points.map((p, i) =>
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ')

                  // 영역 채우기 경로 (그라데이션)
                  const areaPath = `
                    M ${padding} ${padding + chartHeight}
                    L ${points[0].x} ${points[0].y}
                    ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}
                    L ${points[points.length - 1].x} ${padding + chartHeight}
                    Z
                  `

                  return (
                    <>
                      {/* Y축 그리드 라인 */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                          key={ratio}
                          x1={padding}
                          y1={padding + chartHeight * (1 - ratio)}
                          x2={padding + chartWidth}
                          y2={padding + chartHeight * (1 - ratio)}
                          stroke="#E5E7EB"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {/* 그라데이션 영역 */}
                      <path
                        d={areaPath}
                        fill="url(#areaGradient)"
                      />

                      {/* 꺾은선 */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#A80569"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* 데이터 포인트 */}
                      {points.map((point, index) => (
                        <g key={index}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="#fff"
                            stroke="#A80569"
                            strokeWidth="3"
                            className="hover:r-7 transition-all cursor-pointer"
                          />
                          {/* X축 라벨 (날짜) */}
                          <text
                            x={point.x}
                            y={padding + chartHeight + 25}
                            textAnchor="middle"
                            className="text-xs fill-gray-600"
                          >
                            {new Date(point.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          </text>
                          {/* 값 표시 */}
                          {point.count > 0 && (
                            <text
                              x={point.x}
                              y={point.y - 10}
                              textAnchor="middle"
                              className="text-xs font-semibold fill-wine-700"
                            >
                              {point.count}
                            </text>
                          )}
                        </g>
                      ))}

                      {/* Y축 라벨 */}
                      {[0, Math.ceil(maxCount / 2), maxCount].map((value, i) => (
                        <text
                          key={i}
                          x={padding - 10}
                          y={padding + chartHeight - (value / maxCount) * chartHeight + 5}
                          textAnchor="end"
                          className="text-xs fill-gray-500"
                        >
                          {value}
                        </text>
                      ))}
                    </>
                  )
                })()}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string
  description: string
}

function StatCard({ icon, title, value, description }: StatCardProps) {
  return (
    <div className="bg-[#F4F2EF] rounded-lg shadow p-3 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row items-center sm:items-start">
        <div className="flex-shrink-0 text-wine-600">
          {icon}
        </div>
        <div className="sm:ml-5 w-full sm:w-0 sm:flex-1 text-center sm:text-left mt-2 sm:mt-0">
          <dl>
            <dt className="text-[10px] sm:text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex flex-col sm:flex-row items-center sm:items-baseline">
              <div className="text-xl sm:text-2xl font-semibold text-gray-900">
                {value}
              </div>
              <div className="sm:ml-2 text-[10px] sm:text-sm text-gray-500">
                {description}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
