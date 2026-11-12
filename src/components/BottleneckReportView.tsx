import React, { useState, useMemo } from 'react';
import { WorkOrder, EquipmentItem, PROCESS_STAGES, STAGE_CONFIGS } from '../types/mes';
import { analyzeBottlenecks } from '../utils/stCalculator';
import { 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  FileText, 
  ArrowRight,
  Download,
  AlertCircle,
  Truck,
  ShieldAlert,
  Search,
  ExternalLink,
  Layers,
  BarChart2,
  PieChart,
  SplitSquareVertical
} from 'lucide-react';

interface BottleneckReportViewProps {
  workOrders: WorkOrder[];
  equipmentList: EquipmentItem[];
  onSelectOrder?: (order: WorkOrder) => void;
  onOpenLTExclusion?: (order: WorkOrder) => void;
}

export const BottleneckReportView: React.FC<BottleneckReportViewProps> = ({
  workOrders,
  equipmentList,
  onSelectOrder,
  onOpenLTExclusion
}) => {
  const [activeTab, setActiveTab] = useState<'ST_LT_SEPARATION' | 'STAGE_BOTTLENECK'>('ST_LT_SEPARATION');
  const [filterType, setFilterType] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXCLUDED' | 'SUBCONTRACT' | 'RETENTION_ALERT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const analyses = useMemo(() => analyzeBottlenecks(workOrders), [workOrders]);

  // Count of long retention orders (> 10 days dwell)
  const longRetentionCount = useMemo(() => {
    return workOrders.filter(o => o.hasLongRetentionAlert).length;
  }, [workOrders]);

  // Aggregate ST vs Transfer vs Total LT across all work orders
  const ltMacroStats = useMemo(() => {
    let totalNetSTMins = 0;
    let totalTransferMins = 0;
    let totalQueueMins = 0;
    let totalLTHours = 0;
    let totalLTDays = 0;
    let excludedCount = 0;

    workOrders.forEach(o => {
      totalNetSTMins += o.netSTMinutes || 0;
      totalTransferMins += o.transferMinutes || 0;
      totalQueueMins += o.queueMinutes || 0;
      totalLTHours += o.totalLeadTimeHours || (o.leadTimeDays || 0) * 24;
      totalLTDays += o.leadTimeDays || 0;
      if (o.isLTExcluded) excludedCount++;
    });

    const count = workOrders.length || 1;
    const avgNetSTHours = (totalNetSTMins / count / 60);
    const avgTransferHours = (totalTransferMins / count / 60);
    const avgQueueHours = (totalQueueMins / count / 60);
    const avgLTHours = (totalLTHours / count);
    const avgLTDays = (totalLTDays / count).toFixed(1);

    const sumTotalMins = totalNetSTMins + totalTransferMins + totalQueueMins || 1;
    const stRatio = Math.round((totalNetSTMins / sumTotalMins) * 100);
    const transferRatio = Math.round((totalTransferMins / sumTotalMins) * 100);
    const queueRatio = Math.max(1, 100 - stRatio - transferRatio);

    return {
      count,
      avgLTDays,
      avgNetSTHours: avgNetSTHours.toFixed(1),
      avgTransferHours: avgTransferHours.toFixed(1),
      avgQueueHours: avgQueueHours.toFixed(1),
      avgLTHours: avgLTHours.toFixed(1),
      stRatio,
      transferRatio,
      queueRatio,
      excludedCount
    };
  }, [workOrders]);

  // Filtered work orders for ST/LT separation table
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(o => {
      const days = o.leadTimeDays || 0;
      if (filterType === 'NORMAL' && days >= 15) return false;
      if (filterType === 'WARNING' && (days < 15 || days >= 22)) return false;
      if (filterType === 'CRITICAL' && days < 22) return false;
      if (filterType === 'EXCLUDED' && !o.isLTExcluded) return false;
      if (filterType === 'SUBCONTRACT' && !o.subcontractor) return false;
      if (filterType === 'RETENTION_ALERT' && !o.hasLongRetentionAlert) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBc = o.barcode?.toLowerCase().includes(q);
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchProd = o.productName.toLowerCase().includes(q);
        const matchVendor = o.subcontractor?.toLowerCase().includes(q);
        if (!matchBc && !matchNum && !matchProd && !matchVendor) return false;
      }
      return true;
    });
  }, [workOrders, filterType, searchQuery]);

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      '작업의뢰서번호',
      '바코드',
      '제품명',
      '수량',
      '외주처',
      '순수ST가공시간(분)',
      '물류이동시간(분)',
      '대기및체류시간(분)',
      '총경과LT(일)',
      'LT제외여부',
      '제외차감일수',
      '실인정LT(일)',
      '제외사유'
    ];
    const rows = workOrders.map(o => [
      o.orderNumber,
      o.barcode || '',
      o.productName,
      o.quantity,
      o.subcontractor || '사내가공',
      o.netSTMinutes || 0,
      o.transferMinutes || 0,
      o.queueMinutes || 0,
      o.leadTimeDays || 0,
      o.isLTExcluded ? '제외승인' : '정상',
      o.ltExclusionDays || 0,
      o.adjustedLeadTimeDays || o.leadTimeDays || 0,
      `"${(o.ltExclusionReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MES_ST_이동시간_총LT_분리분석_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                생산 ST 소요시간 vs 이동/대기 vs 총 Lead Time 분석 & 병목 리포트
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              실제 설비 가공 ST 시간과 공정간 이동 물류 시간, 버퍼 대기 시간을 독립 분리하여 총 LT를 정밀 진단하고 기준 초과 시 사유 등록 및 제외를 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ST·LT 분석 CSV 다운로드</span>
            </button>
          </div>
        </div>

        {/* Top View Selector Tabs */}
        <div className="mt-5 flex items-center border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ST_LT_SEPARATION')}
            className={`pb-2.5 font-bold flex items-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'ST_LT_SEPARATION'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="h-4 w-4" />
            ST 가공시간 vs 이동소요 vs 총 LT 25건 분리 관리표
          </button>
          <button
            onClick={() => setActiveTab('STAGE_BOTTLENECK')}
            className={`pb-2.5 font-bold flex items-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'STAGE_BOTTLENECK'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="h-4 w-4" />
            8단계 공정별 ST 편차 & 설비 가동 부하율
          </button>
        </div>
      </div>

      {activeTab === 'ST_LT_SEPARATION' ? (
        <div className="space-y-6">
          {/* Executive Macro ST vs Queue vs Total LT Summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-400" />
                  전체 25개 작업의뢰서 평균 ST 및 Lead Time 구성비 (Empirical MES Benchmark)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  순수 가공시간은 전체 리드타임의 약 7%에 불과하며, 90% 이상이 공정간 이동 및 협력사 외주 대기에서 발생합니다.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">평균 총 Lead Time</div>
                  <div className="text-lg font-black text-white tabular-nums mt-0.5">{ltMacroStats.avgLTDays} <span className="text-xs font-normal text-slate-400">일</span></div>
                  <div className="text-[10px] text-slate-500 font-mono">약 {ltMacroStats.avgLTHours}시간</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-blue-900/40 text-center">
                  <div className="text-[10px] text-blue-400 uppercase">순수 가공 ST</div>
                  <div className="text-lg font-black text-blue-400 tabular-nums mt-0.5">{ltMacroStats.avgNetSTHours} <span className="text-xs font-normal text-slate-400">시간</span></div>
                  <div className="text-[10px] text-blue-300/80 font-bold">{ltMacroStats.stRatio}% 점유</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-900/40 text-center">
                  <div className="text-[10px] text-amber-400 uppercase">공정간 물류 이동</div>
                  <div className="text-lg font-black text-amber-400 tabular-nums mt-0.5">{ltMacroStats.avgTransferHours} <span className="text-xs font-normal text-slate-400">시간</span></div>
                  <div className="text-[10px] text-amber-300/80 font-bold">{ltMacroStats.transferRatio}% 점유</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-purple-900/40 text-center">
                  <div className="text-[10px] text-purple-400 uppercase">버퍼대기 & 외주체류</div>
                  <div className="text-lg font-black text-purple-400 tabular-nums mt-0.5">{ltMacroStats.avgQueueHours} <span className="text-xs font-normal text-slate-400">시간</span></div>
                  <div className="text-[10px] text-purple-300/80 font-bold">{ltMacroStats.queueRatio}% 점유</div>
                </div>
              </div>
            </div>

            {/* Proportion Bar */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  순수 가공 ST ({ltMacroStats.stRatio}%)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  공정간 이동물류 ({ltMacroStats.transferRatio}%)
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  버퍼 대기 및 외주 체류 ({ltMacroStats.queueRatio}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${ltMacroStats.stRatio}%` }} className="bg-blue-500 h-full transition-all" title="순수 ST 가공" />
                <div style={{ width: `${ltMacroStats.transferRatio}%` }} className="bg-amber-500 h-full transition-all" title="공정간 이동" />
                <div style={{ width: `${ltMacroStats.queueRatio}%` }} className="bg-purple-600 h-full transition-all" title="버퍼 대기 및 외주" />
              </div>
            </div>
          </div>

          {/* Table Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                전체 지시서 ({workOrders.length})
              </button>
              <button
                onClick={() => setFilterType('NORMAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterType === 'NORMAL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                정상 LT (&lt;15일)
              </button>
              <button
                onClick={() => setFilterType('WARNING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterType === 'WARNING'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                주의 LT (15~22일)
              </button>
              <button
                onClick={() => setFilterType('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterType === 'CRITICAL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                초과 LT (&ge;22일)
              </button>
              <button
                onClick={() => setFilterType('EXCLUDED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'EXCLUDED'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="h-3 w-3 text-emerald-400" />
                LT 제외 승인건 ({ltMacroStats.excludedCount})
              </button>
              <button
                onClick={() => setFilterType('SUBCONTRACT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'SUBCONTRACT'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Truck className="h-3 w-3 text-purple-300" />
                외주 위탁건 (12)
              </button>
              <button
                onClick={() => setFilterType('RETENTION_ALERT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'RETENTION_ALERT'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800 hover:bg-rose-900/50'
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                🚨 10일 초과 체류 알람 ({longRetentionCount})
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

          {/* 25 Work Orders ST vs Transfer vs Total LT Breakdown Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">작업의뢰서 (바코드)</th>
                    <th className="px-4 py-3">품목정보</th>
                    <th className="px-4 py-3">가공 형태 / 외주처</th>
                    <th className="px-4 py-3 text-right">실제 ST 가공</th>
                    <th className="px-4 py-3 text-right">이동중 소요시간</th>
                    <th className="px-4 py-3 text-right">대기 & 외주체류</th>
                    <th className="px-4 py-3 text-center">총 Lead Time</th>
                    <th className="px-4 py-3">LT 제외 및 인정 일수</th>
                    <th className="px-4 py-3 text-center">LT 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {filteredWorkOrders.map((order) => {
                    const netSTHours = ((order.netSTMinutes || 0) / 60).toFixed(1);
                    const transferHours = ((order.transferMinutes || 0) / 60).toFixed(1);
                    const queueHours = ((order.queueMinutes || 0) / 60).toFixed(1);
                    const days = order.leadTimeDays || 0;
                    const isLongLT = days >= 22;
                    const isMediumLT = days >= 15 && days < 22;

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onSelectOrder?.(order)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-semibold text-white group-hover:text-indigo-400 flex items-center gap-1.5">
                              {order.orderNumber}
                              <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              바코드: {order.barcode}
                            </div>
                            {order.hasLongRetentionAlert && (
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                                <span>체류 {order.maxStageDwellDays}일 ({order.longRetentionStageName})</span>
                              </div>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{order.productName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {order.productCode} · {order.quantity} EA
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {order.subcontractor ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-purple-400" />
                              <span className="font-medium text-purple-300">
                                {order.subcontractor}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({order.subcontractorLeadDays}일)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              사내 전 공정
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          <div className="font-bold text-blue-400">{netSTHours} 시간</div>
                          <div className="text-[10px] text-slate-500">{order.netSTMinutes}분</div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          <div className="font-semibold text-amber-400">{transferHours} 시간</div>
                          <div className="text-[10px] text-slate-500">{order.transferMinutes}분</div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          <div className="font-semibold text-purple-300">{queueHours} 시간</div>
                          <div className="text-[10px] text-slate-500">{order.queueMinutes}분</div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span 
                            className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                              isLongLT 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                : isMediumLT 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {days} 일
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {order.isLTExcluded ? (
                            <div>
                              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>인정 {order.adjustedLeadTimeDays}일 (-{order.ltExclusionDays}일 차감)</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={order.ltExclusionReason || undefined}>
                                {order.ltExclusionReason}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              정상 집계 (제외 없음)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onOpenLTExclusion?.(order)}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                              order.isLTExcluded
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                : days >= 15
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {order.isLTExcluded ? '사유/재개 관리' : 'LT 제외 신청'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stage-Level Bottleneck & Equipment Analysis */
        <div className="space-y-6">
          {/* Bottleneck Summary Alert Box */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-2">
                  <span>현장 실적 기반 3대 중점 병목 발생 지점:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                  <li>
                    <strong className="text-rose-600 dark:text-rose-400">정밀가공 (C2 CNC MCT 라인):</strong> OKUMA MCT#11 (PR-OK-511) 복합가공(탭/키홀/내경/내단경) 1건당 평균 6~12시간(최대 713분) 소요로 최고 대기열 형성.
                  </li>
                  <li>
                    <strong className="text-amber-600 dark:text-amber-400">EP / 단폴리싱 (외주 전환):</strong> 주식회사 에스와이텍 / 온테크놀로지 외주 위탁 시 출고부터 입고까지 14일~22일 소요되어 전체 리드타임의 65% 차지.
                  </li>
                  <li>
                    <strong className="text-blue-600 dark:text-blue-400">CMP 4HEAD #5:</strong> 슬러리 유량 및 패드 평탄도 관리 요인으로 설비 가동 부하율 96% 도달.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 8-Stage Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                8단계 전 공정별 소요시간 분석 매트릭스
              </h3>
              <span className="text-xs text-slate-400">실시간 집계 기준</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">공정 단계</th>
                    <th className="py-3 px-4">현장 주요 설비 및 공정코드</th>
                    <th className="py-3 px-4 text-right">계획 ST</th>
                    <th className="py-3 px-4 text-right">실제 ST가공</th>
                    <th className="py-3 px-4 text-center">평균 체류기간</th>
                    <th className="py-3 px-4 text-center">ST대비 체류배율</th>
                    <th className="py-3 px-4 text-center">10일초과 장기체류 알람</th>
                    <th className="py-3 px-4 text-center">대기 / 진행 물량</th>
                    <th className="py-3 px-4 text-center">병목 진단</th>
                    <th className="py-3 px-4">최적화 조치 가이드</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {analyses.map((a, idx) => {
                    const config = STAGE_CONFIGS[a.stage];
                    const isCritical = a.severity === 'critical';
                    const isWarning = a.severity === 'warning';

                    const subCodes: Record<string, string> = {
                      '소재가공': 'PR-WJ-001/002 워터젯 (20 CORE)',
                      '1차가공': 'PR-AG-503 횡로타리 / NC원통 (30 면 / 40 외경)',
                      '정밀가공': 'PR-OK-511 MCT & Drill (60~120 복합가공)',
                      'ED': 'PR-SB-002 표면 에칭 1그룹 (160 면 에칭)',
                      'EP': 'PR-PL-024 단폴리싱 M/C #11 (170 단폴리싱 / 외주 14일)',
                      'CMP': 'PR-PL-010 CMP 4HEAD #5 (190 폴리싱)',
                      '세정': 'PR-SB-007 RING 세정 1조 (200 세정)',
                      '포장': 'PR-ZZ-014 클린룸 포장테이블 (210 검사 / 900 포장)'
                    };

                    const hasStageLongRetention = (a.longRetentionCount || 0) > 0;

                    return (
                      <tr 
                        key={a.stage}
                        className={`transition-colors ${
                          hasStageLongRetention
                            ? 'bg-rose-50/40 dark:bg-rose-950/25'
                            : isCritical
                            ? 'bg-rose-50/20 dark:bg-rose-950/15'
                            : isWarning
                            ? 'bg-amber-50/30 dark:bg-amber-950/15'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-mono">
                              {idx + 1}
                            </span>
                            <span>{a.stage}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {subCodes[a.stage] || config.equipmentCategory}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {a.plannedAvgST}분
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {a.actualAvgTime}분
                        </td>

                        {/* Average Dwell Days */}
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums whitespace-nowrap">
                          <span className={`font-bold ${hasStageLongRetention ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                            {a.avgDwellDays ? `${a.avgDwellDays.toFixed(1)}일` : '0일'}
                          </span>
                        </td>

                        {/* ST vs Dwell Ratio Multiple */}
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums whitespace-nowrap">
                          <span className={`font-bold ${hasStageLongRetention ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {a.stVsDwellRatio || 1}배
                          </span>
                        </td>

                        {/* 10-Day Retention Alarm Column */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {hasStageLongRetention ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              🚨 {a.longRetentionCount}건 경보
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              정상 (10일 이내)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums whitespace-nowrap">
                          <span className="text-amber-600 font-semibold">{a.activeWaitingCount}대기</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-blue-600 font-semibold">{a.inProgressCount}진행</span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isCritical ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              심각 병목
                            </span>
                          ) : isWarning ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              주의 감지
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              정상 운영
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-[280px]">
                          {a.recommendation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Bars & Equipment Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                공정별 계획 ST vs 실제 소요시간 시각화 비교
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                파란색: 계획 표준시간(ST) | 주황색: 실제 평균 소요시간
              </p>

              <div className="space-y-3.5">
                {analyses.map(a => {
                  const maxVal = Math.max(...analyses.map(item => Math.max(item.plannedAvgST, item.actualAvgTime)), 120);
                  const plannedWidth = Math.round((a.plannedAvgST / maxVal) * 100);
                  const actualWidth = Math.round((a.actualAvgTime / maxVal) * 100);

                  return (
                    <div key={a.stage} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {a.stage}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ST: {a.plannedAvgST}분 vs 실소요: {a.actualAvgTime}분
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${plannedWidth}%` }}
                          ></div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              a.actualAvgTime > a.plannedAvgST * 1.2
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${actualWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipment Load & Utilization Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                공정별 설비 가동 부하율 (Equipment Utilization)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                가동률 90% 이상 설비는 잠재적 라인 스톱 병목 구간입니다.
              </p>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {equipmentList.map(eq => {
                  const isOverloaded = eq.utilizationRate >= 90;

                  return (
                    <div key={eq.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {eq.equipmentName}
                          </span>
                          <span className="text-[10px] text-slate-400">({eq.linkedProcess})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOverloaded && (
                            <span className="text-[10px] text-rose-600 font-bold">
                              과부하
                            </span>
                          )}
                          <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {eq.utilizationRate}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isOverloaded
                              ? 'bg-rose-500'
                              : eq.utilizationRate >= 75
                              ? 'bg-blue-600'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${eq.utilizationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
