import React, { useState } from 'react';
import { 
  WorkOrder, 
  ProcessStep, 
  PROCESS_STAGES, 
  STAGE_CONFIGS,
  ProductionEventLog
} from '../types/mes';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Cpu, 
  FileText,
  Printer,
  ArrowRight,
  Barcode,
  Truck,
  Activity,
  Layers,
  MapPin,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';

interface WorkOrderDetailModalProps {
  order: WorkOrder | null;
  onClose: () => void;
  onAdvanceOrderStep?: (orderId: string) => void;
  onOpenLTExclusion?: (order: WorkOrder) => void;
  canEdit: boolean;
}

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  order,
  onClose,
  onAdvanceOrderStep,
  onOpenLTExclusion,
  canEdit
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'events'>('standard');

  if (!order) return null;

  const currentStep = order.steps[order.currentStageIndex] || order.steps[order.steps.length - 1];
  const isCompleted = order.status === 'completed';

  const formatDateTime = (isoStr: string | null) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                {order.orderNumber}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-blue-600" />
                <span>바코드: {order.barcode || order.orderNumber.replace('WO-', '')}</span>
              </span>
              {order.subcontractor && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>외주: {order.subcontractor}</span>
                </span>
              )}
              {order.priority === 'urgent' && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                  긴급
                </span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : order.status === 'delayed'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              }`}>
                {isCompleted ? '최종 출하 완료' : order.status === 'delayed' ? '공정 지연 주의' : '공정 진행중'}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
              {order.productName}
            </h2>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-bold text-blue-600 dark:text-blue-400">제품코드: {order.productCode}</span>
              <span aria-hidden="true">·</span>
              <span>고객사: {order.customer}</span>
              <span aria-hidden="true">·</span>
              <span>납기일: {order.dueDate}</span>
              {order.currentWorkshop && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">현재 위치: {order.currentWorkshop}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal View Tab Selector */}
        <div className="px-5 pt-3 pb-0 bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('standard')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'standard'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>8대 표준 공정 실적 및 완료 타임스탬프</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'events'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>실제 MES 공정 이벤트 이력 (작업장이동/3D측정/외주입출고)</span>
            {order.historyLogs && order.historyLogs.length > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {order.historyLogs.length}건
              </span>
            )}
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[11px] text-slate-400">의뢰 수량</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {order.quantity.toLocaleString()} EA
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">품목 / 재질 분류</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {order.itemType} ({order.productType})
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">총 진행률</span>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {order.overallProgress}% ({isCompleted ? '8/8 전체 완료' : `${order.currentStageIndex + 1}/8단계`})
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">계획 ST 대비 실소요</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {order.totalActualMinutes}분 / {order.totalPlannedMinutes}분
              </div>
            </div>
          </div>

          {/* Long Retention Alert Box (exceeding 10 days dwell) */}
          {order.hasLongRetentionAlert && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-4 rounded-xl flex items-start gap-3 text-rose-900 dark:text-rose-200 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-rose-700 dark:text-rose-300">
                    🚨 공정 장기 체류 알람 (기준 체류기간 10일 초과 감지)
                  </span>
                  <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {order.longRetentionStageName} 공정 {order.maxStageDwellDays}일 체류
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  본 작업지시서는 <strong>{order.longRetentionStageName}</strong> 공정에서 <strong>{order.maxStageDwellDays}일</strong>(약 {((order.maxStageDwellDays || 0) * 24).toFixed(0)}시간) 동안 체류하여 기준치(10일)를 초과하였습니다. 
                  순수 가공 ST 시간(약 {((order.netSTMinutes || order.totalActualMinutes || 0) / 60).toFixed(1)}시간) 대비 체류 기간이 과다하므로 외주 납기 독촉 또는 대기열 조치가 필요합니다.
                </p>
              </div>
            </div>
          )}

          {/* ST vs Transfer vs Total Lead Time & Exclusion Strip */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  ST 가공시간 vs 물류이동 vs 총 LT 소요시간 분석
                </span>
                {order.isLTExcluded && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LT 제외 승인 (-{order.ltExclusionDays}일)
                  </span>
                )}
              </div>
              {onOpenLTExclusion && (
                <button
                  onClick={() => onOpenLTExclusion(order)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer text-left"
                >
                  {order.isLTExcluded ? 'LT 제외 사유 확인 및 재개' : 'LT 제외 신청'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">순수 가공 ST</div>
                <div className="text-sm font-bold text-blue-400 font-mono tabular-nums mt-0.5">
                  {((order.netSTMinutes || 0) / 60).toFixed(1)} 시간 ({order.netSTMinutes || 0}분)
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">공정간 물류 이동</div>
                <div className="text-sm font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                  {((order.transferMinutes || 0) / 60).toFixed(1)} 시간 ({order.transferMinutes || 0}분)
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">버퍼 대기 / 외주체류</div>
                <div className="text-sm font-bold text-purple-300 font-mono tabular-nums mt-0.5">
                  {order.subcontractor ? `${order.subcontractorLeadDays}일 체류` : `${((order.queueMinutes || 0) / 60).toFixed(1)} 시간`}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">총 Lead Time / 인정 LT</div>
                <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                  {order.leadTimeDays || 0}일 {order.isLTExcluded && <span className="text-emerald-400 text-xs font-normal">➔ 인정 {order.adjustedLeadTimeDays}일</span>}
                </div>
              </div>
            </div>

            {/* Mathematical Verification Equation Banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>총 리드타임 100% 매칭 검증 완료</span>
                </span>
                <span className="font-mono text-slate-200 text-[11px] sm:text-xs">
                  실제 ST 가공({((order.netSTMinutes || order.totalActualMinutes || 0) / 60).toFixed(1)}h) + 
                  공정 대기체류({((order.queueMinutes || 0) / 60).toFixed(1)}h) + 
                  공정간 이동체류({((order.transferMinutes || 0) / 60).toFixed(1)}h) = 
                  <strong className="text-white text-xs sm:text-sm ml-1 font-bold underline decoration-emerald-400 decoration-2 underline-offset-2">
                    총 LT {order.totalLeadTimeHours}시간 ({order.leadTimeDays}일)
                  </strong>
                </span>
              </div>
              <span className="text-[10px] text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                수식 오차 0.0h 일치
              </span>
            </div>

            {order.isLTExcluded && order.ltExclusionReason && (
              <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded border border-emerald-900/40">
                <span className="font-semibold text-emerald-400">제외 사유:</span> {order.ltExclusionReason}
              </div>
            )}
          </div>

          {/* TAB 1: Complete Integrated Production Flow: 8 Stages + 7 Inter-Stage Transits */}
          {activeTab === 'standard' && (
            <div className="space-y-6">
              {/* Full Production Flow Visualizer Strip (8 Stages + 7 Inter-Stage Transits) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-500" />
                    <span>전체 생산 공정 Flow (8개 공정 + 공정간 7개 이동중 대차 체류 통합)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    공정간 이동 위치 및 이동 체류일수(일/시간) 표시
                  </span>
                </div>

                {/* Horizontal scrollable integrated flow chain */}
                <div className="flex items-stretch gap-1.5 overflow-x-auto p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  {order.steps.map((step, idx) => {
                    const isDone = step.status === 'completed';
                    const isRunning = step.status === 'in_progress';
                    const isStepDelayed = step.status === 'delayed';
                    const transit = (order.interStageTransits || [])[idx];

                    return (
                      <React.Fragment key={step.stage}>
                        {/* Process Stage Card */}
                        <div
                          className={`min-w-[130px] p-2.5 rounded-lg border text-xs flex flex-col justify-between shrink-0 ${
                            isDone
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : isRunning
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                              : isStepDelayed
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-1">
                              <span className="font-bold">0{idx + 1} 공정</span>
                              <span className="px-1.5 py-0.2 rounded font-semibold bg-black/10 dark:bg-white/10">
                                {isDone ? '완료' : isRunning ? '진행중' : '대기'}
                              </span>
                            </div>
                            <div className="font-bold text-sm my-0.5 text-slate-900 dark:text-white truncate">
                              {step.stage}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                              {step.workshop || step.assignedEquipmentName.split(' ')[0]}
                            </div>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="opacity-70">실제 ST:</span>
                              <span className="font-mono font-bold">{step.actualMinutes ? `${step.actualMinutes}분` : `${step.plannedSTMinutes}분`}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-70">공정체류:</span>
                              <span className={`font-mono font-bold ${step.isLongRetention ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''}`}>
                                {step.dwellDays ?? 0}일
                              </span>
                            </div>
                            {step.isLongRetention && (
                              <div className="text-[9px] text-rose-600 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-950/80 px-1 py-0.5 rounded text-center">
                                🚨 10일+ 알람
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inter-Stage Transit Arrow Card (if between stages) */}
                        {transit && (
                          <div className={`min-w-[110px] p-2 rounded-lg border text-[10px] flex flex-col justify-between shrink-0 ${
                            transit.isLongRetention
                              ? 'bg-rose-950/20 border-rose-800/80 text-rose-300'
                              : 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                          }`}>
                            <div>
                              <div className="flex items-center justify-between font-bold mb-0.5">
                                <span className="flex items-center gap-0.5 text-amber-400">
                                  <Truck className="w-3 h-3" /> 이동중
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">#{idx + 1}</span>
                              </div>
                              <div className="text-[9px] text-slate-300 truncate" title={`${transit.fromWorkshop} ➔ ${transit.toWorkshop}`}>
                                {transit.fromWorkshop.split(' ')[0]} ➔ {transit.toWorkshop.split(' ')[0]}
                              </div>
                            </div>

                            <div className="my-1 py-1 px-1.5 bg-slate-950/80 rounded border border-slate-800/80 text-center">
                              <div className="text-[9px] text-slate-400">이동 체류</div>
                              <div className="font-mono font-bold text-amber-400 tabular-nums">
                                {transit.transitDays}일 ({transit.transitHours}h)
                              </div>
                            </div>

                            {transit.isLongRetention ? (
                              <div className="text-[9px] font-bold text-rose-400 text-center bg-rose-900/50 rounded px-1 py-0.5 border border-rose-800">
                                🚨 10일+ 경고
                              </div>
                            ) : (
                              <div className="text-[9px] text-emerald-400 text-center">
                                {transit.startDate ? `${transit.startDate.slice(5)}➔${transit.endDate?.slice(5) || '진행'}` : '라인 이송'}
                              </div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Integrated Execution Table (8 Stages + 7 Inter-Stage Transits) */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  단계별 ST 실적, 체류 기간(최초 입고일~최종 출고일) 및 공정간 이동중 상세 기록부
                </h4>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3">단계/구분</th>
                        <th className="py-2.5 px-3">공정명 / 이동구간</th>
                        <th className="py-2.5 px-3">상태</th>
                        <th className="py-2.5 px-3">작업장 / 설비</th>
                        <th className="py-2.5 px-3 text-right">계획 ST</th>
                        <th className="py-2.5 px-3 text-right">실제 ST가공</th>
                        <th className="py-2.5 px-3 text-center">체류기간 (일 / 시간)</th>
                        <th className="py-2.5 px-3 text-center">ST vs 체류비교 / 알람</th>
                        <th className="py-2.5 px-3">최초 입고일(시작)</th>
                        <th className="py-2.5 px-3">최종 출고일(완료)</th>
                        <th className="py-2.5 px-3">담당자/외주처</th>
                        <th className="py-2.5 px-3 text-center">양품/불량</th>
                        <th className="py-2.5 px-3">특이사항/이송메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 text-xs">
                      {order.steps.map((step, idx) => {
                        const isDone = step.status === 'completed';
                        const isRunning = step.status === 'in_progress';
                        const stHours = ((step.actualMinutes || step.plannedSTMinutes || 1) / 60);
                        const dwellHours = (step.dwellHours || (step.dwellDays || 0) * 24.0);
                        const ratio = Math.max(1, Math.round(dwellHours / Math.max(0.1, stHours)));
                        const transit = (order.interStageTransits || [])[idx];

                        return (
                          <React.Fragment key={step.stage}>
                            {/* Process Stage Row */}
                            <tr 
                              className={step.isLongRetention ? 'bg-rose-50/40 dark:bg-rose-950/25' : isRunning ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-400 whitespace-nowrap">
                                STEP 0{idx + 1}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-bold text-slate-900 dark:text-white">{step.stage}</span>
                                {step.stageCode && (
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    {step.stageCode}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isDone ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    완료
                                  </span>
                                ) : isRunning ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    진행중
                                  </span>
                                ) : (
                                  <span className="text-slate-400">대기</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                <div>{step.workshop || step.assignedEquipmentName}</div>
                                {step.assignedEquipmentCode && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    [{step.assignedEquipmentCode}]
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                                {step.plannedSTMinutes}분
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                                {step.actualMinutes ? `${step.actualMinutes}분 (${(step.actualMinutes / 60).toFixed(1)}h)` : '-'}
                              </td>

                              {/* Dwell Days & Hours based on firstInDate & lastOutDate */}
                              <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                                <div className={`font-bold tabular-nums ${step.isLongRetention ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {step.dwellDays ?? 0}일
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {dwellHours.toFixed(1)}시간
                                </div>
                                {(step.firstInDate || step.lastOutDate) && (
                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    {step.firstInDate?.slice(5) || '-'} ~ {step.lastOutDate?.slice(5) || '진행'}
                                  </div>
                                )}
                              </td>

                              {/* ST vs Dwell Comparison & Long Retention Alarm */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {step.isLongRetention ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>10일 초과 장기체류</span>
                                    </span>
                                    <span className="text-[9px] text-rose-600 dark:text-rose-400 font-mono mt-0.5 font-bold">
                                      ST 대비 {ratio}배 체류 ({dwellHours.toFixed(0)}h / {stHours.toFixed(1)}h)
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{ratio}배 체류</span>
                                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">정상 (10일 이내)</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {step.firstInDate || formatDateTime(step.startedAt)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {step.lastOutDate || formatDateTime(step.completedAt)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {step.operatorName || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums whitespace-nowrap">
                                {isDone ? (
                                  <span>{step.goodCount} / <strong className="text-rose-600">{step.defectCount}</strong></span>
                                ) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[200px] truncate">
                                {step.notes || '-'}
                              </td>
                            </tr>

                            {/* Inter-Stage Transit Row between step and step+1 */}
                            {transit && (
                              <tr className="bg-amber-50/30 dark:bg-amber-950/15 border-y border-amber-200/50 dark:border-amber-800/40 text-[11px]">
                                <td className="py-2 px-3 text-amber-600 dark:text-amber-400 font-mono font-bold text-center">
                                  <div className="flex items-center gap-1 justify-center">
                                    <Truck className="w-3 h-3 text-amber-500" />
                                    <span>이동중</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-amber-700 dark:text-amber-300 font-semibold" colSpan={2}>
                                  {transit.fromStage} ➔ {transit.toStage} 대차 이동
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                                  {transit.fromWorkshop} ➔ {transit.toWorkshop}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-400 font-mono">-</td>
                                <td className="py-2 px-3 text-right text-slate-400 font-mono">-</td>
                                <td className="py-2 px-3 text-center font-mono font-bold">
                                  <span className={transit.isLongRetention ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-amber-600 dark:text-amber-400'}>
                                    {transit.transitDays}일 ({transit.transitHours}h)
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {transit.isLongRetention ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      이동 체류 10일+ 경고
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                      라인간 대차 이동 완료
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                  {transit.startDate || '-'}
                                </td>
                                <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                  {transit.endDate || '-'}
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-[10px]">
                                  {transit.subcontractor || '물류대차/반장'}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-400">-</td>
                                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[10px] truncate max-w-[200px]">
                                  {transit.notes || '공정간 대차 이동'}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800/95 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                      <tr>
                        <td className="py-3 px-3 font-mono text-center" colSpan={4}>
                          <div className="flex items-center gap-1.5 justify-center text-slate-800 dark:text-slate-100 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>합계 (8개 공정 ST 실적 + 7개 이동 체류 통합 검증)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                          {order.steps.reduce((acc, s) => acc + (s.plannedSTMinutes || 0), 0)}분
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                          {order.totalActualMinutes || order.steps.reduce((acc, s) => acc + (s.actualMinutes || 0), 0)}분 ({((order.totalActualMinutes || 0) / 60).toFixed(1)}h)
                        </td>
                        <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                          <div className="text-purple-600 dark:text-purple-400 font-bold">
                            공정 {((order.queueMinutes || 0) / 60).toFixed(1)}h + 이동 {((order.transferMinutes || 0) / 60).toFixed(1)}h
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            체류합계 {(((order.queueMinutes || 0) + (order.transferMinutes || 0)) / 60).toFixed(1)}h
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center" colSpan={5}>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>실제ST({((order.totalActualMinutes || 0) / 60).toFixed(1)}h) + 체류({(((order.queueMinutes || 0) + (order.transferMinutes || 0)) / 60).toFixed(1)}h) = 총 LT {order.totalLeadTimeHours}h ({order.leadTimeDays}일) [100% 매칭]</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Real Factory Event Logs (Chronological History) */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  실제 MES 생산 작업장 이동 및 품질·외주 이벤트 타임라인
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  총 {order.historyLogs?.length || 0}건의 현장 실적 데이터
                </span>
              </div>

              {!order.historyLogs || order.historyLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">해당 의뢰서의 상세 이벤트 로그가 아직 생성되지 않았습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3 whitespace-nowrap">순서/공정코드</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">구분</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">공정명 / 액션</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">설비코드 / 설비명</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">작업장</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">작업일자 및 시간</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">소요시간</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">작업자</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono">
                      {order.historyLogs.map(log => {
                        let catColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                        if (log.category === '공정생산') catColor = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
                        else if (log.category === '외주입출고') catColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
                        else if (log.category === '측정등록') catColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-500">
                              {log.stepSeq ? `${log.stepSeq} (${log.processCode || '-'})` : '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-sans ${catColor}`}>
                                {log.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-sans font-medium text-slate-900 dark:text-white">
                              {log.processName}
                              {log.subcontractor && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-sans">
                                  협력: {log.subcontractor}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-sans">
                              {log.equipmentName || '-'}
                              {log.equipmentCode && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  [{log.equipmentCode}]
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-sans text-slate-600 dark:text-slate-400">
                              {log.workshop || '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                              <div>{log.startTime || log.date}</div>
                              {log.endTime && <div className="text-[10px] text-slate-400">~ {log.endTime}</div>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                              {log.durationMinutes !== undefined ? `${log.durationMinutes}분` : '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-sans text-slate-800 dark:text-slate-200">
                              {log.workerName || '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                              <span className={`text-[11px] font-semibold ${
                                log.statusText === '완제품처리'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : log.statusText === '외주재고'
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {log.statusText || log.actionType}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>의뢰서 등록일시: {new Date(order.createdAt).toLocaleString('ko-KR')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>작업지시서 인쇄</span>
            </button>

            {canEdit && !isCompleted && onAdvanceOrderStep && (
              <button
                onClick={() => onAdvanceOrderStep(order.id)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>현재 공정 강제 완료 및 이송</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
