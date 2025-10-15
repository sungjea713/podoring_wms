import React, { useState } from 'react'
import { Wine, BarChart3, Package } from 'lucide-react'
import { Dashboard } from './Dashboard'
import { WineList } from './WineList'
import { InventoryGrid } from './InventoryGrid'

type Tab = 'dashboard' | 'wines' | 'inventory'

export function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Wine className="w-6 h-6 sm:w-8 sm:h-8 text-wine-600" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  Podoring WMS
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden xs:block">Wine Management System</p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 hidden md:block">
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
      <nav className="bg-white border-b border-gray-200 sticky top-[57px] sm:top-[65px] z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar">
            <TabButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<BarChart3 className="w-4 h-4" />}
            >
              대시보드
            </TabButton>
            <TabButton
              active={activeTab === 'wines'}
              onClick={() => setActiveTab('wines')}
              icon={<Wine className="w-4 h-4" />}
            >
              와인 목록
            </TabButton>
            <TabButton
              active={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              icon={<Package className="w-4 h-4" />}
            >
              재고 관리
            </TabButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'wines' && <WineList />}
          {activeTab === 'inventory' && <InventoryGrid />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs sm:text-sm text-gray-500">
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
  icon: React.ReactNode
  children: React.ReactNode
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0
        ${active
          ? 'border-wine-600 text-wine-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
