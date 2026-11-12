import React from 'react';
import { WorkOrder, EquipmentItem } from '../types/mes';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  TrendingUp,
  Cpu
} from 'lucide-react';

interface OverviewStatsProps {
  workOrders: WorkOrder[];
  equipmentList: EquipmentItem[];
  onSelectFilter?: (status: string) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  workOrders,
  equipmentList,
  onSelectFilter
}) => {
  const totalOrders = workOrders.length;
  const inProgressOrders = workOrders.filter(o => o.status === 'in_progress').length;
  const completedOrders = workOrders.filter(o => o.status === 'completed').length;
  const delayedOrders = workOrders.filter(o => o.status === 'delayed').length;

  // Calculate average ST compliance
  let completedStepsTotal = 0;
  let onTimeSteps = 0;
  workOrders.forEach(o => {
    o.steps.forEach(s => {
      if (s.status === 'completed' && s.actualMinutes !== null) {
        completedStepsTotal++;
        if (s.actualMinutes <= s.plannedSTMinutes * 1.1) {
          onTimeSteps++;
        }
      }
    });
  });

  const stComplianceRate = completedStepsTotal > 0 
    ? Math.round((onTimeSteps / completedStepsTotal) * 100) 
    : 92;

  // Equipment utilization
  const activeEquipments = equipmentList.filter(e => e.status === 'running' || e.status === 'bottleneck').length;
  const avgUtilization = Math.round(
    equipmentList.reduce((acc, curr) => acc + curr.utilizationRate, 0) / (equipmentList.length || 1)
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4 mb-6">
      {/* 1. Total Orders */}
      <div 
        onClick={() => onSelectFilter && onSelectFilter('all')}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">전체 작업의뢰서</span>
          <Layers className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {totalOrders}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">건</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>총 생산수량:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {workOrders.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()} EA
          </span>
        </div>
      </div>

      {/* 2. In Progress */}
      <div 
        onClick={() => onSelectFilter && onSelectFilter('in_progress')}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer"
      >
        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
          <span className="text-xs font-medium">공정 진행중</span>
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
            {inProgressOrders}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">라인 가동</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>설비 가동률:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {avgUtilization}% ({activeEquipments}/{equipmentList.length}기)
          </span>
        </div>
      </div>

      {/* 3. Completed & Shipped */}
      <div 
        onClick={() => onSelectFilter && onSelectFilter('completed')}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer"
      >
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
          <span className="text-xs font-medium">최종 출하 완료</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {completedOrders}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">건 완료</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>공정 완료율:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* 4. Delayed / Bottleneck Alerts */}
      <div 
        onClick={() => onSelectFilter && onSelectFilter('delayed')}
        className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 transition-all hover:border-rose-400 cursor-pointer"
      >
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
          <span className="text-xs font-medium">지연 / 병목 경보</span>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {delayedOrders}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">건 주의</span>
        </div>
        <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <span>병목 공정:</span>
          <span className="font-semibold">CMP (부하율 96%)</span>
        </div>
      </div>

      {/* 5. ST Compliance Rate */}
      <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">표준시간(ST) 준수율</span>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {stComplianceRate}%
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">정상</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>검사 완료 공정:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {completedStepsTotal}단계 집계
          </span>
        </div>
      </div>
    </div>
  );
};
