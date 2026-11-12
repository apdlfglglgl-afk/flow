import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  Search, 
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  FileCheck2,
  Undo2
} from 'lucide-react';
import { WorkOrder, UserRole } from '../types/mes';

interface OutsourcingDashboardViewProps {
  orders: WorkOrder[];
  currentUserRole: UserRole;
  onSelectOrder: (order: WorkOrder) => void;
  onOpenLTExclusion: (order: WorkOrder) => void;
  onUpdateSubcontractorStatus?: (orderId: string, status: '외주가공중' | '입고검사중' | '입고완료') => void;
}

export const OutsourcingDashboardView: React.FC<OutsourcingDashboardViewProps> = ({
  orders,
  currentUserRole,
  onSelectOrder,
  onOpenLTExclusion
}) => {
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<'ALL' | 'SY' | 'ON' | 'DELAYED' | 'EXCLUDED' | 'RETENTION_10'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all outsourced orders
  const outsourcedOrders = useMemo(() => {
    return orders.filter(o => Boolean(o.subcontractor));
  }, [orders]);

  // Vendor statistics
  const vendorStats = useMemo(() => {
    const syOrders = outsourcedOrders.filter(o => o.subcontractor?.includes('에스와이텍'));
    const onOrders = outsourcedOrders.filter(o => o.subcontractor?.includes('온테크놀로지'));

    const avgSYDays = syOrders.length > 0 
      ? (syOrders.reduce((acc, cur) => acc + (cur.subcontractorLeadDays || 0), 0) / syOrders.length).toFixed(1)
      : '0';

    const avgONDays = onOrders.length > 0 
      ? (onOrders.reduce((acc, cur) => acc + (cur.subcontractorLeadDays || 0), 0) / onOrders.length).toFixed(1)
      : '0';

    const totalDays = outsourcedOrders.reduce((acc, cur) => acc + (cur.subcontractorLeadDays || 0), 0);
    const overallAvg = outsourcedOrders.length > 0 ? (totalDays / outsourcedOrders.length).toFixed(1) : '0';

    const longRetentionCount = outsourcedOrders.filter(o => (o.subcontractorLeadDays || 0) >= 20).length;
    const retention10Count = outsourcedOrders.filter(o => (o.subcontractorLeadDays || 0) >= 10).length;
    const excludedCount = outsourcedOrders.filter(o => o.isLTExcluded).length;

    return {
      total: outsourcedOrders.length,
      syCount: syOrders.length,
      onCount: onOrders.length,
      avgSYDays,
      avgONDays,
      overallAvg,
      longRetentionCount,
      retention10Count,
      excludedCount
    };
  }, [outsourcedOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return outsourcedOrders.filter(o => {
      // Vendor filter
      if (selectedVendorFilter === 'SY' && !o.subcontractor?.includes('에스와이텍')) return false;
      if (selectedVendorFilter === 'ON' && !o.subcontractor?.includes('온테크놀로지')) return false;
      if (selectedVendorFilter === 'DELAYED' && (o.subcontractorLeadDays || 0) < 20) return false;
      if (selectedVendorFilter === 'RETENTION_10' && (o.subcontractorLeadDays || 0) < 10) return false;
      if (selectedVendorFilter === 'EXCLUDED' && !o.isLTExcluded) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBarcode = o.barcode?.toLowerCase().includes(q);
        const matchNumber = o.orderNumber.toLowerCase().includes(q);
        const matchProd = o.productName.toLowerCase().includes(q);
        const matchVendor = o.subcontractor?.toLowerCase().includes(q);
        if (!matchBarcode && !matchNumber && !matchProd && !matchVendor) return false;
      }

      return true;
    });
  }, [outsourcedOrders, selectedVendorFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  외주 가공 및 체류일수 관리 대시보드
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    전담 2개 협력사 실시간 추적
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  주식회사 에스와이텍(기계가공) 및 주식회사 온테크놀로지(단폴리싱) 외주 입·출고일, 체류일수, 공정 상태 및 LT 예외 인정 관리
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">외주 관리 총 작업건</div>
              <div className="text-2xl font-bold text-white tabular-nums">{vendorStats.total} <span className="text-xs font-normal text-slate-400">건</span></div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-xs text-slate-400">평균 외주 체류일수</div>
              <div className="text-2xl font-bold text-amber-400 tabular-nums">{vendorStats.overallAvg} <span className="text-xs font-normal text-slate-400">일</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Dedicated Vendor Profile Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SY Tech Card */}
        <div className="rounded-xl border border-blue-900/40 bg-slate-900/90 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-base">
                SY
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">주식회사 에스와이텍</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium">
                    기계가공 전담
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  위탁 공정: 면가공, 외경가공, CORE, HOLE, 내단경/MCT 초정밀 가공
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
              협력사 활성
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-4">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">위탁 작업 건수</div>
              <div className="text-lg font-bold text-white tabular-nums mt-0.5">{vendorStats.syCount} 건</div>
              <div className="text-[10px] text-slate-500">총 175 EA 생산</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">평균 외주 체류일수</div>
              <div className="text-lg font-bold text-blue-400 tabular-nums mt-0.5">{vendorStats.avgSYDays} 일</div>
              <div className="text-[10px] text-slate-500">장기 정밀가공 공정</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">입고 수입검사</div>
              <div className="text-lg font-bold text-emerald-400 tabular-nums mt-0.5">100%</div>
              <div className="text-[10px] text-emerald-500/90">3D CMM 전수합격</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              9월 전기로 보전 및 물류 지연건 2건 LT 예외 차감 승인
            </span>
            <button 
              onClick={() => setSelectedVendorFilter('SY')}
              className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              에스와이텍 건만 보기 <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ON Technology Card */}
        <div className="rounded-xl border border-violet-900/40 bg-slate-900/90 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold text-base">
                ON
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">주식회사 온테크놀로지</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 font-medium">
                    단폴리싱(EP) 전담
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  위탁 공정: 단 Polishing M/C 표면 조도 개선, 단차 경면 연마
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-500/20">
              협력사 활성
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-4">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">위탁 작업 건수</div>
              <div className="text-lg font-bold text-white tabular-nums mt-0.5">{vendorStats.onCount} 건</div>
              <div className="text-[10px] text-slate-500">총 125 EA 생산</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">평균 외주 체류일수</div>
              <div className="text-lg font-bold text-violet-400 tabular-nums mt-0.5">{vendorStats.avgONDays} 일</div>
              <div className="text-[10px] text-slate-500">단기 고속 표면가공</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-[11px] text-slate-400">입고 수입검사</div>
              <div className="text-lg font-bold text-emerald-400 tabular-nums mt-0.5">100%</div>
              <div className="text-[10px] text-emerald-500/90">표면조도 Ra 전수합격</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              평균 9~14일 내 신속 반입으로 사내 2동-CP/세정 공정 순조 연계
            </span>
            <button 
              onClick={() => setSelectedVendorFilter('ON')}
              className="text-violet-400 hover:text-violet-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              온테크놀로지 건만 보기 <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedVendorFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedVendorFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            전체 외주 ({outsourcedOrders.length})
          </button>
          <button
            onClick={() => setSelectedVendorFilter('SY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedVendorFilter === 'SY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            주식회사 에스와이텍 ({vendorStats.syCount})
          </button>
          <button
            onClick={() => setSelectedVendorFilter('ON')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedVendorFilter === 'ON'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            주식회사 온테크놀로지 ({vendorStats.onCount})
          </button>
          <button
            onClick={() => setSelectedVendorFilter('RETENTION_10')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              selectedVendorFilter === 'RETENTION_10'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800 hover:bg-rose-900/50'
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            🚨 10일 초과 장기 체류 알람 ({vendorStats.retention10Count})
          </button>
          <button
            onClick={() => setSelectedVendorFilter('DELAYED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedVendorFilter === 'DELAYED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock className="h-3 w-3 text-amber-300" />
            체류 20일 이상 극심 지연 ({vendorStats.longRetentionCount})
          </button>
          <button
            onClick={() => setSelectedVendorFilter('EXCLUDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedVendorFilter === 'EXCLUDED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="h-3 w-3 text-emerald-300" />
            LT 제외 승인건 ({vendorStats.excludedCount})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="바코드, 지시서번호, 품목 검색..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Outsourcing Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">작업의뢰서 (바코드)</th>
                <th className="px-4 py-3">품목정보</th>
                <th className="px-4 py-3">외주 협력사</th>
                <th className="px-4 py-3">외주 위탁 공정</th>
                <th className="px-4 py-3">외주 출고일</th>
                <th className="px-4 py-3">외주 입고일</th>
                <th className="px-4 py-3 text-center">외주 체류일수</th>
                <th className="px-4 py-3">총 LT / 인정 LT</th>
                <th className="px-4 py-3">LT 제외 상태</th>
                <th className="px-4 py-3 text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    선택한 조건에 부합하는 외주 작업의뢰서가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSY = order.subcontractor?.includes('에스와이텍');
                  const retentionDays = order.subcontractorLeadDays || 0;
                  const isCriticalDelay = retentionDays >= 22;
                  const isModerateDelay = retentionDays >= 15 && retentionDays < 22;

                  return (
                    <tr 
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-semibold text-white group-hover:text-indigo-400 flex items-center gap-1.5">
                            {order.orderNumber}
                            <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            바코드: {order.barcode}
                          </div>
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-100">{order.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.productCode} · <span className="text-slate-300">{order.quantity} EA</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className={`h-2 w-2 rounded-full ${
                              isSY ? 'bg-blue-400' : 'bg-violet-400'
                            }`} 
                          />
                          <span className={`font-medium ${isSY ? 'text-blue-300' : 'text-violet-300'}`}>
                            {order.subcontractor}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {order.subcontractorProcesses && order.subcontractorProcesses.length > 0 ? (
                            order.subcontractorProcesses.map((proc, pidx) => (
                              <span 
                                key={pidx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                              >
                                {proc}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {isSY ? '면/외경/MCT 가공' : '단폴리싱(EP)'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300">
                        {order.subcontractorOutDate || '-'}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300">
                        {order.subcontractorInDate ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {order.subcontractorInDate}
                          </span>
                        ) : (
                          <span className="text-amber-400">외주 체류중</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span 
                            className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                              retentionDays >= 10
                                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 font-extrabold'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {retentionDays} 일
                          </span>
                          {retentionDays >= 10 ? (
                            <span className="text-[10px] text-rose-400 font-bold mt-0.5 flex items-center gap-0.5 animate-pulse">
                              <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                              장기체류 알람
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 mt-0.5">적정 (10일 이내)</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="tabular-nums">
                          <span className="font-semibold text-slate-200">{order.leadTimeDays}일</span>
                          {order.isLTExcluded && order.adjustedLeadTimeDays && (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                              <ArrowRight className="h-3 w-3" />
                              인정 {order.adjustedLeadTimeDays}일 (-{order.ltExclusionDays}일)
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {order.isLTExcluded ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              LT 제외 승인
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1 max-w-[190px] truncate" title={order.ltExclusionReason || undefined}>
                              {order.ltExclusionReason}
                            </div>
                          </div>
                        ) : retentionDays >= 15 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                            LT 예외 신청 검토
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            정상 집계중
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenLTExclusion(order)}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                              order.isLTExcluded
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                : 'bg-indigo-600/90 text-white hover:bg-indigo-500 shadow-sm'
                            }`}
                          >
                            {order.isLTExcluded ? '사유/재개 관리' : 'LT 제외 신청'}
                          </button>
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
    </div>
  );
};
