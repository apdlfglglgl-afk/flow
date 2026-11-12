import React from 'react';
import { 
  Bell, 
  Layers, 
  BarChart3, 
  ClipboardPaste, 
  ShieldCheck, 
  HardHat, 
  User, 
  Sun, 
  Moon,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { UserRole } from '../types/mes';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  onOpenNewOrder: () => void;
  onOpenClipboardSync: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  userRole,
  onRoleChange,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenNewOrder,
  onOpenClipboardSync,
  isDarkMode,
  onToggleDarkMode
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              MES
            </div>
            <a 
              href="#overview" 
              onClick={(e) => { e.preventDefault(); onTabChange('overview'); }}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
            >
              Smart MES Scheduler
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => onTabChange('overview')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 ${
                currentTab === 'overview' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              종합 공정 현황
            </button>
            <button
              onClick={() => onTabChange('orders')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 ${
                currentTab === 'orders' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              작업의뢰서 (25건)
            </button>
            <button
              onClick={() => onTabChange('outsourcing')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'outsourcing' 
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              외주 관리 대시보드
            </button>
            <button
              onClick={() => onTabChange('simulator')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'simulator' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              10월 공정 시뮬레이터
            </button>
            <button
              onClick={() => onTabChange('bottleneck')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 ${
                currentTab === 'bottleneck' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              ST·LT 소요 & 병목 리포트
            </button>
            <button
              onClick={() => onTabChange('operator')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'operator' 
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              현장 작업자 모드
            </button>
            <button
              onClick={() => onTabChange('audit')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer pb-0.5 border-b-2 ${
                currentTab === 'audit' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'border-transparent'
              }`}
            >
              시스템 접근 로그
            </button>
          </nav>

          {/* Zone 3: Actions & Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Master Data Clipboard Sync Button */}
            <button
              onClick={onOpenClipboardSync}
              title="설비 및 ST 마스터데이터 클립보드 붙여넣기"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>클립보드 동기화</span>
            </button>

            {/* Admin New Order Button (visible only in admin mode) */}
            {userRole === 'admin' && (
              <button
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>의뢰서 등록</span>
              </button>
            )}

            {/* Role Switcher Pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onRoleChange('admin')}
                title="관리자 권한 (전체 설정 및 감사로그)"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  userRole === 'admin'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                관리자
              </button>
              <button
                onClick={() => onRoleChange('worker')}
                title="현장 작업자 권한 (공정 시작/완료 진도 처리)"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  userRole === 'worker'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                작업자
              </button>
              <button
                onClick={() => onRoleChange('viewer')}
                title="조회자 (읽기 전용 모니터링)"
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer hidden md:inline-block ${
                  userRole === 'viewer'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                조회자
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              title="알림 센터"
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[10px] font-bold text-white bg-rose-600 rounded-full">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar for smaller screens */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800 gap-2 no-scrollbar">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            종합 현황
          </button>
          <button
            onClick={() => onTabChange('orders')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            의뢰서 (25건)
          </button>
          <button
            onClick={() => onTabChange('outsourcing')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'outsourcing' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            외주 관리
          </button>
          <button
            onClick={() => onTabChange('simulator')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'simulator' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            10월 시뮬레이터
          </button>
          <button
            onClick={() => onTabChange('bottleneck')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'bottleneck' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            ST·LT 분석
          </button>
          <button
            onClick={() => onTabChange('operator')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'operator' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            작업자 모드
          </button>
          <button
            onClick={() => onTabChange('audit')}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              currentTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            접근 로그
          </button>
          <button
            onClick={onOpenClipboardSync}
            className="px-3 py-1 text-xs whitespace-nowrap rounded-md text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            클립보드 동기화
          </button>
        </div>
      </div>
    </header>
  );
};
