import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Undo2, 
  AlertTriangle, 
  Calendar, 
  FileText,
  User,
  History
} from 'lucide-react';
import { WorkOrder, LTExclusionRecord, UserProfile } from '../types/mes';

interface LTExclusionModalProps {
  order: WorkOrder | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onApplyExclusion: (
    orderId: string, 
    reason: string, 
    excludedDays: number, 
    notes: string
  ) => void;
  onResumeLT: (
    orderId: string, 
    resumeNotes: string
  ) => void;
}

const PRESET_REASONS = [
  '외주사(에스와이텍/온테크) 정밀가공 설비 오버홀 및 추석 물류 지연',
  '고객사(Lam Research/AMAT) 도면/스펙 변경 검토로 인한 공정 홀드 (Customer Hold)',
  '원자재 잉곳 비저항 규격 산포로 인한 소재 로트 재검증 및 승인 대기',
  '3차원 CMM 초정밀 측정 재검증 및 품질 보증 특별 샘플링 분석',
  '사내 핵심 MCT 설비 비계획 긴급 보전(스핀들 수리)으로 인한 라인 일시 정체',
  '기타 (직접 입력)'
];

export const LTExclusionModal: React.FC<LTExclusionModalProps> = ({
  order,
  currentUser,
  isOpen,
  onClose,
  onApplyExclusion,
  onResumeLT
}) => {
  if (!isOpen || !order) return null;

  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [excludedDays, setExcludedDays] = useState<number>(order.ltExclusionDays || 15);
  const [notes, setNotes] = useState<string>('');
  const [resumeNotes, setResumeNotes] = useState<string>('현장 라인 정상화 및 외주 입고 완료에 따른 정상 LT 집계 복원');

  const finalReason = selectedPreset === '기타 (직접 입력)' ? customReason : selectedPreset;
  const isExcluded = Boolean(order.isLTExcluded);
  const totalDays = order.leadTimeDays || 0;
  const calculatedAdjustedDays = Math.max(0.5, totalDays - excludedDays).toFixed(1);

  const handleSubmitExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalReason.trim()) {
      alert('LT 제외 사유를 입력해주세요.');
      return;
    }
    if (excludedDays <= 0) {
      alert('제외할 일수를 1일 이상 입력해주세요.');
      return;
    }
    onApplyExclusion(order.id, finalReason.trim(), excludedDays, notes.trim());
    onClose();
  };

  const handleConfirmResume = () => {
    onResumeLT(order.id, resumeNotes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                리드타임(LT) 제외 및 재개 관리
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                  {order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                바코드: {order.barcode} · {order.productName} ({order.quantity} EA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Current LT Metrics Summary */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400">총 경과 Lead Time</div>
              <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                {totalDays} <span className="text-xs font-normal text-slate-400">일</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                약 {order.totalLeadTimeHours || totalDays * 24}시간
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">순수 가공 ST</div>
              <div className="text-lg font-bold text-blue-400 tabular-nums mt-0.5">
                {((order.netSTMinutes || 0) / 60).toFixed(1)} <span className="text-xs font-normal text-slate-400">시간</span>
              </div>
              <div className="text-[10px] text-slate-500">
                순수 설비 가동시간
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">외주 / 물류 대기</div>
              <div className="text-lg font-bold text-amber-400 tabular-nums mt-0.5">
                {order.subcontractorLeadDays ? `${order.subcontractorLeadDays}일` : '사내 대기'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {order.subcontractor || '사내 공정 이동'}
              </div>
            </div>
          </div>

          {/* Current Status State: Excluded vs Normal */}
          {isExcluded ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  현재 LT 제외가 승인 및 적용 중인 지시서입니다.
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  제외 -{order.ltExclusionDays}일 차감중
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div><span className="text-slate-400">승인 사유:</span> {order.ltExclusionReason}</div>
                <div><span className="text-slate-400">인정 Lead Time:</span> <span className="text-emerald-400 font-bold font-mono">{order.adjustedLeadTimeDays || totalDays - (order.ltExclusionDays || 0)}일</span> (기존 {totalDays}일)</div>
                {order.ltExclusionDate && (
                  <div><span className="text-slate-400">승인 일시:</span> {order.ltExclusionDate}</div>
                )}
              </div>

              {/* Resume Section */}
              <div className="pt-2 border-t border-emerald-900/40 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    정상 LT 집계 재개 사유 및 비고 (Resume Notes)
                  </label>
                  <input
                    type="text"
                    value={resumeNotes}
                    onChange={(e) => setResumeNotes(e.target.value)}
                    placeholder="재개 사유를 입력하세요 (예: 외주품 정상 반입 완료)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResume}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition shadow-md"
                  >
                    <Undo2 className="h-4 w-4" />
                    정상 LT 집계로 다시 재개 (Resume)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitExclusion} className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="font-semibold">LT 제외 기능 안내</div>
                  외주사 제작 지연, 원자재 물성 재검증, 고객사 도면변경 홀드 등 제조공정 외 불가항력적인 소요 시간을 생산 납기 및 KPI 지표에서 공식 제외 처리합니다.
                </div>
              </div>

              {/* Preset Reason Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LT 제외 표준 사유 선택
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {PRESET_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason if '기타' */}
              {selectedPreset === '기타 (직접 입력)' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    상세 제외 사유 기술 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="구체적인 제외 사유를 명시하세요..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Excluded Days Input & Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    제외할 소요 일수 (일) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      required
                      value={excludedDays}
                      onChange={(e) => setExcludedDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tabular-nums"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">일</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <div className="text-[11px] text-slate-400">제외 적용 후 인정 LT</div>
                  <div className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                    {calculatedAdjustedDays} 일 <span className="text-xs text-slate-500 font-normal">(-{excludedDays}일 차감)</span>
                  </div>
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  생산관리팀 검토 비고 / 공문 번호
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="예: 협력사 공식 납기 지연 공문 접수 및 생산운영본부 사전 승인 완료"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition shadow-md"
                >
                  <ShieldAlert className="h-4 w-4" />
                  LT 제외 확정 및 승인
                </button>
              </div>
            </form>
          )}

          {/* Audit History for this order */}
          {order.ltExclusionHistory && order.ltExclusionHistory.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                <History className="h-3.5 w-3.5 text-indigo-400" />
                이 지시서의 LT 제외 / 재개 감사 이력
              </h4>
              <div className="space-y-1.5">
                {order.ltExclusionHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          rec.action === 'exclude' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {rec.action === 'exclude' ? `LT 제외 (-${rec.excludedDays}일)` : 'LT 정상 재개'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">{rec.date}</span>
                        <span className="text-slate-300 text-[11px]">처리자: {rec.actor}</span>
                      </div>
                      <div className="text-slate-300 mt-1 text-[11px]">{rec.reason}</div>
                      {rec.notes && (
                        <div className="text-slate-500 text-[10px] mt-0.5">{rec.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
