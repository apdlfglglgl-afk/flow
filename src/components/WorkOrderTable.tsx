import React, { useState } from 'react';
import { 
  WorkOrder, 
  ProcessStageName, 
  PROCESS_STAGES, 
  STAGE_CONFIGS 
} from '../types/mes';
import { 
  Search, 
  Filter, 
  RotateCcw,
  ArrowUpDown,
  Barcode,
  Truck,
  Building2,
  Calendar,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  selectedStage: ProcessStageName | 'all';
  onSelectStage: (stage: ProcessStageName | 'all') => void;
  onSelectOrder: (order: WorkOrder) => void;
  onOpenNewOrder?: () => void;
  onOpenLTExclusion?: (order: WorkOrder) => void;
  canEdit: boolean;
}

export const WorkOrderTable: React.FC<WorkOrderTableProps> = ({
  workOrders,
  selectedStage,
  onSelectStage,
  onSelectOrder,
  onOpenNewOrder,
  onOpenLTExclusion,
  canEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, urgent, this_week
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [workshopFilter, setWorkshopFilter] = useState<string>('all');
  const [retentionFilter, setRetentionFilter] = useState<'all' | 'long_retention'>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'progress' | 'orderNumber' | 'barcode'>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Extract counts for quick filters
  const longRetentionCount = workOrders.filter(o => o.hasLongRetentionAlert).length;
  const outsourcedCount = workOrders.filter(o => !!o.subcontractor).length;
  const urgentCount = workOrders.filter(o => o.priority === 'urgent').length;

  // Extract unique workshops
  const uniqueWorkshops = Array.from(new Set(workOrders.map(o => o.currentWorkshop).filter(Boolean))) as string[];

  // Filter logic
  const filteredOrders = workOrders.filter(order => {
    // 1. Long retention filter (> 10 days dwell)
    if (retentionFilter === 'long_retention' && !order.hasLongRetentionAlert) {
      return false;
    }

    // 2. Search Query (OrderNumber, Barcode, ProductCode, ProductName, Customer, Subcontractor)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        order.orderNumber.toLowerCase().includes(q) ||
        (order.barcode && order.barcode.toLowerCase().includes(q)) ||
        order.productCode.toLowerCase().includes(q) ||
        order.productName.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        (order.subcontractor && order.subcontractor.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 3. Stage Filter
    if (selectedStage !== 'all') {
      const hasStage = order.steps.some(s => s.stage === selectedStage && (s.status === 'in_progress' || s.status === 'ready'));
      if (!hasStage) return false;
    }

    // 4. Status Filter
    if (statusFilter !== 'all') {
      if (order.status !== statusFilter) return false;
    }

    // 5. Workshop Filter
    if (workshopFilter !== 'all') {
      if (order.currentWorkshop !== workshopFilter) return false;
    }

    // 6. Date Filter
    if (dateFilter === 'urgent') {
      const due = new Date(order.dueDate).getTime();
      const now = new Date('2026-10-28').getTime();
      const diffDays = (due - now) / (1000 * 60 * 60 * 24);
      if (diffDays > 3 || order.status === 'completed') return false;
    } else if (dateFilter === 'this_week') {
      const due = new Date(order.dueDate).getTime();
      const now = new Date('2026-10-28').getTime();
      const diffDays = (due - now) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 7) return false;
    }

    return true;
  });

  // Sort
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'dueDate') {
      const cmp = a.dueDate.localeCompare(b.dueDate);
      return sortAsc ? cmp : -cmp;
    } else if (sortField === 'progress') {
      return sortAsc ? a.overallProgress - b.overallProgress : b.overallProgress - a.overallProgress;
    } else if (sortField === 'barcode') {
      const bA = a.barcode || a.orderNumber;
      const bB = b.barcode || b.orderNumber;
      const cmp = bA.localeCompare(bB);
      return sortAsc ? cmp : -cmp;
    } else {
      const cmp = a.orderNumber.localeCompare(b.orderNumber);
      return sortAsc ? cmp : -cmp;
    }
  });

  const getDDay = (dueDateStr: string, isCompleted: boolean) => {
    if (isCompleted) return '완료';
    const due = new Date(dueDateStr);
    const now = new Date('2026-10-28');
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `지연 D+${Math.abs(diffDays)}`;
    if (diffDays === 0) return 'D-Day 오늘';
    return `D-${diffDays}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Header & Filter Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>작업의뢰서 실시간 공정 진행 리스트</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (총 {workOrders.length}건 중 {sortedOrders.length}건 표시)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              작업의뢰서번호, 바코드, 제품코드, 제품명, 납기일 및 8단계 표준 공정 단계별 타임스탬프와 현장 위치를 실시간 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateFilter('all');
                setItemTypeFilter('all');
                setWorkshopFilter('all');
                setRetentionFilter('all');
                onSelectStage('all');
              }}
              title="필터 초기화"
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>

            {canEdit && onOpenNewOrder && (
              <button
                onClick={onOpenNewOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <span>+ 신규 의뢰서 등록</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* 1. Universal Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="바코드(100247158), 의뢰서번호, 제품코드, 제품명, 외주처 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 2. Process Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => onSelectStage(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">전체 공정 (8단계)</option>
              {PROCESS_STAGES.map((s, idx) => (
                <option key={s} value={s}>{idx + 1}. {s}</option>
              ))}
            </select>
          </div>

          {/* 3. Workshop Filter */}
          <div>
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">작업장 전체</option>
              {uniqueWorkshops.map(ws => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">상태 전체</option>
              <option value="in_progress">공정 진행중 (In Progress)</option>
              <option value="delayed">지연 주의 (Delayed)</option>
              <option value="completed">완제품 출하 (Completed)</option>
              <option value="scheduled">소재 대기 (Scheduled)</option>
            </select>
          </div>
        </div>

        {/* Quick Alarm & Status Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">빠른 필터:</span>
          
          <button
            type="button"
            onClick={() => setRetentionFilter(retentionFilter === 'long_retention' ? 'all' : 'long_retention')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              retentionFilter === 'long_retention'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🚨 10일 초과 장기 체류 알람 ({longRetentionCount}건)</span>
          </button>

          <button
            type="button"
            onClick={() => setDateFilter(dateFilter === 'urgent' ? 'all' : 'urgent')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              dateFilter === 'urgent'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>긴급 납기 (D-3 이내: {urgentCount}건)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (searchQuery === '외주') setSearchQuery('');
              else setSearchQuery('외주');
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              searchQuery === '외주'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Truck className="w-3 h-3" />
            <span>외주 관리 ({outsourcedCount}건)</span>
          </button>

          {retentionFilter === 'long_retention' && (
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              * 특정 공정 체류기간 10일을 초과한 지시서만 필터링 중입니다.
            </span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th 
                onClick={() => {
                  if (sortField === 'barcode') setSortAsc(!sortAsc);
                  else { setSortField('barcode'); setSortAsc(true); }
                }}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>작업의뢰서 / 바코드</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">제품 정보 (제품코드 / 제품명)</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">수량</th>
              <th 
                onClick={() => {
                  if (sortField === 'dueDate') setSortAsc(!sortAsc);
                  else { setSortField('dueDate'); setSortAsc(true); }
                }}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>납기일</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 whitespace-nowrap">현재 공정 & 작업장</th>
              <th className="py-3 px-3 text-center whitespace-nowrap">ST vs 공정체류</th>
              <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">
                8단계 공정 진도 (소재가공~포장)
              </th>
              <th 
                onClick={() => {
                  if (sortField === 'progress') setSortAsc(!sortAsc);
                  else { setSortField('progress'); setSortAsc(true); }
                }}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>진행률</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center whitespace-nowrap">상태</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                    <span>조건에 일치하는 작업의뢰서가 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                const currentStep = order.steps[order.currentStageIndex] || order.steps[order.steps.length - 1];
                const isCompleted = order.status === 'completed';
                const isDelayed = order.status === 'delayed';
                const dDayLabel = getDDay(order.dueDate, isCompleted);
                const isDDayUrgent = dDayLabel.includes('D-') && parseInt(dDayLabel.replace('D-', '')) <= 3;

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* 1. Work Order Number & Barcode */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold">{order.orderNumber}</span>
                        {order.priority === 'urgent' && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                            [긴급]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3 h-3 text-slate-400" />
                        <span>바코드: {order.barcode || order.orderNumber.replace('WO-', '')}</span>
                      </div>
                      {order.subcontractor && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5 mt-0.5">
                          <Truck className="w-2.5 h-2.5" />
                          <span>{order.subcontractor}</span>
                        </div>
                      )}
                      {order.hasLongRetentionAlert && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>[{order.longRetentionStageName}] {order.maxStageDwellDays}일 체류</span>
                        </div>
                      )}
                    </td>

                    {/* 2. Product Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                        {order.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{order.productCode}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">{order.customer}</span>
                      </div>
                    </td>

                    {/* 3. Quantity */}
                    <td className="py-3 px-3 text-right font-medium tabular-nums whitespace-nowrap">
                      {order.quantity.toLocaleString()} <span className="text-slate-400 text-[11px]">EA</span>
                    </td>

                    {/* 4. Due Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-800 dark:text-slate-200">
                        {order.dueDate}
                      </div>
                      <div className={`text-[11px] font-medium ${
                        isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDelayed || isDDayUrgent
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {dDayLabel}
                      </div>
                    </td>

                    {/* 5. Current Stage & Workshop */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                        <span>{isCompleted ? '출하 완료' : currentStep.stage}</span>
                        {currentStep.stageCode && (
                          <span className="text-[10px] text-slate-400 font-mono">({currentStep.stageCode})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5">
                        {order.currentWorkshop || currentStep.workshop || currentStep.assignedEquipmentName}
                      </div>
                    </td>

                    {/* 5-B. ST Machining vs Dwell Time Comparison & Long Retention Alarm */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        ST {((order.netSTMinutes || order.totalActualMinutes || 0) / 60).toFixed(1)}h
                      </div>
                      <div className="text-[11px] mt-0.5 flex items-center justify-center gap-1 font-mono">
                        <span className="text-slate-400">최대체류:</span>
                        <span className={`font-bold tabular-nums ${
                          order.hasLongRetentionAlert 
                            ? 'text-rose-600 dark:text-rose-400 font-extrabold' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {order.maxStageDwellDays || 0}일
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        비율: {Math.max(1, Math.round(((order.maxStageDwellDays || 0) * 24) / Math.max(0.1, ((order.netSTMinutes || order.totalActualMinutes || 1) / 60))))}배 체류
                      </div>
                      {order.hasLongRetentionAlert ? (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>🚨 10일+ 알람</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">정상 (10일 이내)</span>
                      )}
                    </td>

                    {/* 6. Complete Flow: 8 Stages + Inter-Stage Transits Tracker */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-0.5">
                        {order.steps.map((step, idx) => {
                          const isDone = step.status === 'completed';
                          const isCurrent = step.status === 'in_progress';
                          const isStepDelayed = step.status === 'delayed';
                          const transit = (order.interStageTransits || [])[idx];

                          let dotColor = 'bg-slate-200 dark:bg-slate-700 text-slate-400';
                          if (step.isLongRetention) dotColor = 'bg-rose-600 text-white ring-2 ring-rose-400';
                          else if (isDone) dotColor = 'bg-emerald-500 text-white';
                          else if (isCurrent) dotColor = 'bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-900';
                          else if (isStepDelayed) dotColor = 'bg-rose-500 text-white';

                          return (
                            <React.Fragment key={step.stage}>
                              {/* Stage Step */}
                              <div 
                                className="flex items-center"
                                title={`STEP ${idx + 1}. ${step.stage} (${step.status === 'completed' ? '완료' : step.status === 'in_progress' ? '진행중' : '대기'}) | 체류: ${step.dwellDays ?? 0}일 ${step.isLongRetention ? '(🚨 10일 이상 장기체류)' : ''}`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${dotColor}`}>
                                  {idx + 1}
                                </div>
                              </div>

                              {/* Inter-Stage Transit Connector */}
                              {idx < 7 && transit && (
                                <div 
                                  className="flex items-center px-0.5"
                                  title={`[이동중] ${transit.fromStage} ➔ ${transit.toStage} | ${transit.fromWorkshop} ➔ ${transit.toWorkshop} | 체류 ${transit.transitDays}일 ${transit.isLongRetention ? '(🚨 10일 이상 장기이동)' : ''}`}
                                >
                                  <div className={`h-1.5 w-2 rounded-full ${
                                    transit.isLongRetention 
                                      ? 'bg-rose-500' 
                                      : transit.transitDays > 0 
                                      ? 'bg-amber-400' 
                                      : isDone 
                                      ? 'bg-emerald-400' 
                                      : 'bg-slate-300 dark:bg-slate-700'
                                  }`} />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>진행:</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {isCompleted ? '전 8공정 완료 (완제품 출하)' : `${order.currentStageIndex + 1}/8단계 (${currentStep.stage})`}
                        </span>
                        {order.hasLongRetentionAlert && (
                          <span className="text-rose-500 font-bold ml-1">
                            [{order.longRetentionStageName} {order.maxStageDwellDays}일 체류]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 7. Overall Progress % */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {order.overallProgress}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ml-auto mt-1">
                        <div 
                          className={`h-full rounded-full ${
                            isCompleted ? 'bg-emerald-500' : isDelayed ? 'bg-rose-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${order.overallProgress}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* 8. Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isCompleted ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          출하완료
                        </span>
                      ) : isDelayed ? (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          지연주의
                        </span>
                      ) : order.status === 'in_progress' ? (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                          공정진행
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          소재대기
                        </span>
                      )}
                    </td>

                    {/* 9. Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors font-medium cursor-pointer"
                        >
                          상세
                        </button>
                        {onOpenLTExclusion && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLTExclusion(order);
                            }}
                            className={`px-2 py-1 text-[11px] rounded transition-colors font-medium cursor-pointer ${
                              order.isLTExcluded
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : (order.leadTimeDays || 0) >= 15
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-200'
                            }`}
                            title={order.isLTExcluded ? `LT 제외 승인 (-${order.ltExclusionDays}일)` : 'LT 제외 신청'}
                          >
                            {order.isLTExcluded ? `-${order.ltExclusionDays}일` : 'LT제외'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
