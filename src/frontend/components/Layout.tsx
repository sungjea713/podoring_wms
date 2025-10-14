import React, { useState } from 'react'
import { Dashboard } from './Dashboard'
import { WineList } from './WineList'
import { InventoryGrid } from './InventoryGrid'

type Tab = 'dashboard' | 'wines' | 'inventory'

export function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🍷</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Podoring WMS
                </h1>
                <p className="text-sm text-gray-500">Wine Management System</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <TabButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon="📊"
            >
              대시보드
            </TabButton>
            <TabButton
              active={activeTab === 'wines'}
              onClick={() => setActiveTab('wines')}
              icon="🍷"
            >
              와인 목록
            </TabButton>
            <TabButton
              active={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              icon="📦"
            >
              재고 관리
            </TabButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'wines' && <WineList />}
          {activeTab === 'inventory' && <InventoryGrid />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            © 2025 Podoring WMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: string
  children: React.ReactNode
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
        ${active
          ? 'border-wine-600 text-wine-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </button>
  )
}
