import React, { useState } from 'react';
import { 
  STMasterRule, 
  EquipmentItem, 
  WorkOrder, 
  OrderPriority, 
  PROCESS_STAGES 
} from '../types/mes';
import { generateProcessStepsForOrder } from '../utils/stCalculator';
import { X, PlusCircle, Sparkles, Calendar, Layers } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stRules: STMasterRule[];
  equipmentList: EquipmentItem[];
  nextOrderNumber: string;
  onCreateOrder: (newOrder: WorkOrder) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  stRules,
  equipmentList,
  nextOrderNumber,
  onCreateOrder
}) => {
  const [orderNumber, setOrderNumber] = useState(nextOrderNumber);
  const [productCode, setProductCode] = useState('PRD-SEM-850');
  const [productName, setProductName] = useState('반도체 고순도 SiC 포커스 링');
  const [itemType, setItemType] = useState('반도체 부품');
  const [productType, setProductType] = useState('세라믹');
  const [quantity, setQuantity] = useState<number>(50);
  const [dueDate, setDueDate] = useState<string>('2026-11-20');
  const [customer, setCustomer] = useState('S사 반도체');
  const [priority, setPriority] = useState<OrderPriority>('high');
  const [notes, setNotes] = useState('초정밀 평탄화 및 Ra 0.05um 표면조도 요구');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim() || !productCode.trim() || !productName.trim() || !dueDate) {
      alert('작업의뢰서번호, 제품코드, 제품명, 납기일은 필수 입력 사항입니다.');
      return;
    }

    const steps = generateProcessStepsForOrder(
      itemType,
      productType,
      quantity,
      stRules,
      equipmentList,
      true // start first step
    );

    const totalPlannedMinutes = steps.reduce((sum, s) => sum + s.plannedSTMinutes, 0);

    const cleanOrderNo = orderNumber.trim();
    const newBarcode = cleanOrderNo.startsWith('WO-') ? cleanOrderNo.replace('WO-', '') : cleanOrderNo;

    const newOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      barcode: newBarcode,
      orderNumber: cleanOrderNo,
      productCode: productCode.trim(),
      productName: productName.trim(),
      itemType,
      productType,
      quantity,
      dueDate,
      createdAt: new Date().toISOString(),
      priority,
      customer: customer.trim() || '사내 생산기획팀',
      currentStageIndex: 0,
      currentWorkshop: '5동-소재공정',
      currentStatusText: '소재가공 (CORE) 투입 대기',
      status: 'in_progress',
      overallProgress: 10,
      totalPlannedMinutes,
      totalActualMinutes: 0,
      steps,
      historyLogs: [],
      notes
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                신규 생산 작업의뢰서 등록
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                입력된 품목 및 제품 종류의 ST 마스터데이터에 맞춰 8단계 공정 일정표가 자동 생성됩니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                작업의뢰서번호 *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="예: WO-2026-109"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                납기일 *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                제품코드 *
              </label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="예: PRD-SEM-850"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                수량 (EA) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              제품명 *
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 초정밀 세라믹 챔버 링"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                품목종류 (ST 연동)
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="반도체 부품">반도체 부품</option>
                <option value="광학 부품">광학 부품</option>
                <option value="2차전지 치구">2차전지 치구</option>
                <option value="항공정밀">항공정밀</option>
                <option value="디스플레이 부품">디스플레이 부품</option>
                <option value="의료정밀">의료정밀</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                제품종류 (재질)
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="세라믹">세라믹 (Ceramic)</option>
                <option value="쿼츠">쿼츠 (Quartz)</option>
                <option value="SiC">탄화규소 (SiC)</option>
                <option value="티타늄">티타늄 합금 (Titanium)</option>
                <option value="인바(Invar)">인바 (Invar)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                고객사
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="예: S사 반도체"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="normal">일반 (Normal)</option>
                <option value="high">우선 (High)</option>
                <option value="urgent">긴급 (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              작업 지시 특이사항 메모
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 클린룸 진공 이중 포장 준수"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-300">
            <span className="font-bold">자동 생성 안내: </span>
            소재가공 → 1차가공 → 정밀가공 → ED → EP → CMP → 세정 → 포장의 8단계 순서로 각 설비 및 계획 ST가 자동 배정되며 즉시 1단계 작업이 시작됩니다.
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
            >
              작업의뢰서 등록 및 공정 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
