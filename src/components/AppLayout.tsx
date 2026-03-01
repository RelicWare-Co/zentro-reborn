import { Link, useLocation } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Menu, Package, Settings, Store } from 'lucide-react'
import { useState } from 'react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: Store },
    { name: 'Productos', path: '/products', icon: Package },
    { name: 'Configuración', path: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-[var(--color-void)] text-[var(--color-photon)] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <button 
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden w-full h-full border-none cursor-default"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'} bg-[var(--color-carbon)] border-r border-gray-800
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-5 border-b border-gray-800 whitespace-nowrap overflow-hidden">
          <Link to="/" className={`block overflow-hidden text-2xl font-bold tracking-tight text-[var(--color-voltage)] transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[120px] opacity-100'}`}>
            Zentro
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hidden lg:flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors ml-auto"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const Icon = item.icon
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center px-3 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-[140px] opacity-100 ml-3'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800 overflow-hidden">
          <button 
            type="button"
            className="flex w-full items-center px-3 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            title={isCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden text-left ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-[140px] opacity-100 ml-3'}`}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 bg-[var(--color-carbon)] border-b border-gray-800">
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 text-xl font-bold text-[var(--color-voltage)]">Zentro</span>
        </header>

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}
