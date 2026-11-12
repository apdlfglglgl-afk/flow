import React, { useState } from 'react';
import { 
  PROCESS_STAGES, 
  ProcessStageName, 
  STAGE_CONFIGS, 
  WorkOrder, 
  EquipmentItem 
} from '../types/mes';
import { 
  HardHat, 
  Play, 
  CheckCircle2, 
  Clock, 
  Check, 
  ScanLine, 
  Barcode,
  Truck,
  Building2,
  Info
} from 'lucide-react';

interface OperatorKioskViewProps {
  workOrders: WorkOrder[];
  equipmentList: EquipmentItem[];
  operatorName: string;
  onStartStep: (orderId: string, stage: ProcessStageName, operatorName: string) => void;
  onCompleteStep: (
    orderId: string, 
    stage: ProcessStageName, 
    operatorName: string, 
    actualMinutes: number, 
    defectCount: number, 
    notes: string
  ) => void;
  onSelectOrder: (order: WorkOrder) => void;
}

export const OperatorKioskView: React.FC<OperatorKioskViewProps> = ({
  workOrders,
  equipmentList,
  operatorName,
  onStartStep,
  onCompleteStep,
  onSelectOrder
}) => {
  const [selectedStation, setSelectedStation] = useState<ProcessStageName>('정밀가공');
  const [scanInput, setScanInput] = useState('');
  const [activeCompletingOrderId, setActiveCompletingOrderId] = useState<string | null>(null);
  const [actualMinutesInput, setActualMinutesInput] = useState<number>(60);
  const [defectCountInput, setDefectCountInput] = useState<number>(0);
  const [operatorNotes, setOperatorNotes] = useState<string>('공차 및 외관 규격 이상 없음 검사 완료');

  // Filter orders for selected station
  const stationOrders = workOrders.filter(order => {
    const step = order.steps.find(s => s.stage === selectedStation);
    return step && (step.status === 'in_progress' || step.status === 'ready' || step.status === 'delayed');
  });

  // Equipments assigned to this station
  const stationEquipments = equipmentList.filter(e => e.linkedProcess === selectedStation);

  const handleOpenCompleteModal = (order: WorkOrder) => {
    const step = order.steps.find(s => s.stage === selectedStation);
    setActiveCompletingOrderId(order.id);
    setActualMinutesInput(step?.plannedSTMinutes || 45);
    setDefectCountInput(0);
    setOperatorNotes('공정 치수 측정 양호 (양품 판정)');
  };

  const handleConfirmComplete = (orderId: string) => {
    onCompleteStep(
      orderId,
      selectedStation,
      operatorName,
      actualMinutesInput,
      defectCountInput,
      operatorNotes
    );
    setActiveCompletingOrderId(null);
  };

  const handleBarcodeSearch = (query: string) => {
    const clean = query.trim().toLowerCase();
    if (!clean) return;

    const found = workOrders.find(
      o => o.orderNumber.toLowerCase() === clean || 
           (o.barcode && o.barcode.toLowerCase() === clean) ||
           o.orderNumber.toLowerCase().includes(clean)
    );

    if (found) {
      onSelectOrder(found);
    } else {
      alert(`바코드 / 의뢰서번호 '${query}'를 시스템에서 찾을 수 없습니다.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Station Selector Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                <HardHat className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                현장 작업자 전용 터치 키오스크 모드
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              담당 공정을 선택하여 의뢰서 바코드 스캔, 작업 착수 및 완료를 즉시 처리하고 단계별 타임스탬프를 실시간 기록합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">현재 작업자</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{operatorName}</div>
            </div>
          </div>
        </div>

        {/* 8 Process Station Buttons */}
        <div className="pt-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
            작업 공정 스테이션 선택 (8단계 순서 연동):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {PROCESS_STAGES.map((stage, idx) => {
              const isSelected = selectedStation === stage;
              const waitingInStage = workOrders.filter(o => {
                const s = o.steps.find(step => step.stage === stage);
                return s && (s.status === 'in_progress' || s.status === 'ready');
              }).length;

              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStation(stage)}
                  className={`p-3 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200 dark:ring-emerald-900'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-80 mb-1">
                    <span>STEP {idx + 1}</span>
                    {waitingInStage > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full font-bold tabular-nums text-[10px] ${
                        isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {waitingInStage}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm tracking-tight">
                    {stage}
                  </div>
                  <div className={`text-[10px] truncate mt-1 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {STAGE_CONFIGS[stage].equipmentCategory}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barcode & Station Machinery Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Barcode Scanner Box */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-blue-600" />
                작업의뢰서 바코드 / QR 스캔 시뮬레이터
              </span>
              <span className="text-[11px] text-slate-400">바코드 번호 입력 후 엔터</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBarcodeSearch(scanInput);
                }}
                placeholder="예: 100247158 또는 WO-100249112 바코드 스캔..."
                className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
              <button
                onClick={() => handleBarcodeSearch(scanInput)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer"
              >
                바코드 조회
              </button>
            </div>
          </div>

          {/* Quick-Scan Suggestion Chips */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] text-slate-400">빠른 테스트 바코드:</span>
            {['100249112', '100248901', '100247158', '100240286', '100235201'].map(bc => (
              <button
                key={bc}
                onClick={() => {
                  setScanInput(bc);
                  handleBarcodeSearch(bc);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono text-[11px] cursor-pointer"
              >
                {bc}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned Equipments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
            <span>공정 연동 설비 목록</span>
            <span className="text-[11px] font-mono text-emerald-600 font-bold">{selectedStation}</span>
          </div>
          <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
            {stationEquipments.map(eq => (
              <div key={eq.id} className="text-xs flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="truncate max-w-[170px]">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{eq.equipmentName}</span>
                  {eq.equipmentCode && (
                    <span className="text-[10px] text-slate-400 font-mono ml-1">[{eq.equipmentCode}]</span>
                  )}
                </div>
                <span className={`text-[11px] font-mono tabular-nums ${eq.status === 'bottleneck' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                  {eq.utilizationRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Work Orders Queue for Current Station */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedStation} 공정 작업 대기열</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ({stationOrders.length}건 대기/진행)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              '공정 시작' 클릭 시 시작 시각과 작업자가 기록되며, '공정 완료' 시 다음 8단계 공정으로 자동 인계됩니다.
            </p>
          </div>
        </div>

        {stationOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Check className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              현재 {selectedStation} 공정에 대기 중인 작업의뢰서가 없습니다.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              이전 공정이 완료되면 자동으로 본 스테이션 대기열로 즉시 이송됩니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stationOrders.map((order) => {
              const step = order.steps.find(s => s.stage === selectedStation);
              if (!step) return null;

              const isRunning = step.status === 'in_progress';
              const isReady = step.status === 'ready';

              return (
                <div
                  key={order.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isRunning
                      ? 'border-blue-400 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          (바코드: {order.barcode || order.orderNumber})
                        </span>
                        {order.priority === 'urgent' && (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                            긴급
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isRunning
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {isRunning ? '공정 진행중' : '작업 대기'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {order.productName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {order.productCode} · {order.customer}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">지시 수량</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        {order.quantity} <span className="text-xs font-normal">EA</span>
                      </div>
                    </div>
                  </div>

                  {/* Standard Time & Equipment Info */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs mb-3">
                    <div>
                      <span className="text-slate-400 text-[11px]">배정 설비:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {step.assignedEquipmentName}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">계획 표준시간(ST):</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {step.plannedSTMinutes}분
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">납기일:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {order.dueDate}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">작업 시작시각:</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums truncate">
                        {step.startedAt ? new Date(step.startedAt).toLocaleTimeString('ko-KR') : '미시작'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isReady ? (
                      <button
                        onClick={() => onStartStep(order.id, selectedStation, operatorName)}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>공정 시작 (작업 개시)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCompleteModal(order)}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>공정 완료 및 다음 공정 이송</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectOrder(order)}
                      className="px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      전체 공정 조회
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Step Confirmation Modal */}
      {activeCompletingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{selectedStation} 공정 완료 처리</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              실제 소요시간 및 검사 결과를 입력하면 다음 공정으로 자동 업데이트되며 완료 타임스탬프가 영구 보존됩니다.
            </p>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  실제 소요시간 (분)
                </label>
                <input
                  type="number"
                  value={actualMinutesInput}
                  onChange={(e) => setActualMinutesInput(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  불량 수량 (EA)
                </label>
                <input
                  type="number"
                  value={defectCountInput}
                  onChange={(e) => setDefectCountInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  작업 메모 / 품질 측정 결과
                </label>
                <textarea
                  rows={2}
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveCompletingOrderId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleConfirmComplete(activeCompletingOrderId)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                완료 승인 및 다음 공정 이송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
