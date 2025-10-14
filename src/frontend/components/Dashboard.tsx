import React from 'react'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>

      {/* Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon="🍷"
          title="총 와인 종류"
          value="0"
          description="등록된 와인"
        />
        <StatCard
          icon="📦"
          title="총 재고"
          value="0"
          description="병"
        />
        <StatCard
          icon="⚠️"
          title="재고 부족"
          value="0"
          description="와인"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          선반별 재고 현황
        </h3>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
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
