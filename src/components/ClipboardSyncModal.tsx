import React, { useState } from 'react';
import { 
  ClipboardPaste, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileSpreadsheet,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  parseClipboardMasterData, 
  getSampleClipboardData, 
  convertParsedRowsToMasters,
  ParseResult 
} from '../utils/clipboardParser';
import { STMasterRule, EquipmentItem } from '../types/mes';

interface ClipboardSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: STMasterRule[];
  currentEquipment: EquipmentItem[];
  onApplySync: (updatedRules: STMasterRule[], updatedEquipment: EquipmentItem[], summaryText: string) => void;
}

export const ClipboardSyncModal: React.FC<ClipboardSyncModalProps> = ({
  isOpen,
  onClose,
  currentRules,
  currentEquipment,
  onApplySync
}) => {
  const [clipboardText, setClipboardText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  // Real-time parsing on text change
  const handleTextChange = (text: string) => {
    setClipboardText(text);
    if (text.trim()) {
      const res = parseClipboardMasterData(text);
      setParseResult(res);
    } else {
      setParseResult(null);
    }
  };

  // Read directly from navigator.clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleTextChange(text);
    } catch (err) {
      alert('클립보드 읽기 권한이 허용되지 않았거나 브라우저에서 차단되었습니다. 텍스트 입력창에 직접 Ctrl+V로 붙여넣어 주세요.');
    }
  };

  // Copy sample template to clipboard
  const handleCopyTemplate = async () => {
    const sample = getSampleClipboardData();
    try {
      await navigator.clipboard.writeText(sample);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      handleTextChange(sample);
    }
  };

  // Load sample data directly into input
  const handleLoadSample = () => {
    const sample = getSampleClipboardData();
    handleTextChange(sample);
  };

  const handleApply = () => {
    if (!parseResult || parseResult.validCount === 0) return;
    setIsApplying(true);

    const { updatedRules, updatedEquipment } = convertParsedRowsToMasters(
      parseResult.rows,
      currentRules,
      currentEquipment
    );

    const summaryText = `클립보드 동기화 완료: ${parseResult.validCount}개 ST 공정 규칙 및 설비 연동 반영`;
    onApplySync(updatedRules, updatedEquipment, summaryText);
    setIsApplying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                클립보드(엑셀/TSV/CSV) 설비 & 공정 ST 마스터데이터 일괄 동기화
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                엑셀이나 구글 스프레드시트에서 복사한 테이블을 붙여넣어 설비종류, 품목종류, 제품종류별 표준시간(ST) 및 공정 연동을 즉시 갱신합니다.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Helper Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">필수 열 구성:</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                설비종류 | 설비명 | 품목종류 | 제품종류 | 연동공정 | ST(분) | 셋업(분) | 시간당CAPA
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTemplate}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyFeedback ? '복사 완료!' : '엑셀 서식 복사'}</span>
              </button>

              <button
                onClick={handleLoadSample}
                className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>샘플 데이터 로드</span>
              </button>

              <button
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>클립보드 붙여넣기</span>
              </button>
            </div>
          </div>

          {/* Paste Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                붙여넣기 텍스트 영역 (Ctrl + V):
              </label>
              {parseResult && (
                <div className="text-xs font-medium flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    유효 행: {parseResult.validCount}건
                  </span>
                  {parseResult.invalidCount > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      오류 행: {parseResult.invalidCount}건
                    </span>
                  )}
                </div>
              )}
            </div>
            <textarea
              rows={6}
              value={clipboardText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="엑셀에서 복사(Ctrl+C)한 표 데이터를 여기에 직접 붙여넣기(Ctrl+V) 하세요...&#10;예시:&#10;고속절단기	SAW-01	반도체 부품	쿼츠	소재가공	25	10	15&#10;5축 고속머시닝	CNC-5AX-01	반도체 부품	쿼츠	정밀가공	80	20	5"
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 whitespace-pre"
            />
          </div>

          {/* Live Parsed Preview Table */}
          {parseResult && parseResult.rows.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                실시간 파싱 및 데이터 유효성 검증 결과 (미리보기):
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg max-h-56">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3">상태</th>
                      <th className="py-2 px-3">설비종류</th>
                      <th className="py-2 px-3">설비명</th>
                      <th className="py-2 px-3">품목종류</th>
                      <th className="py-2 px-3">제품종류</th>
                      <th className="py-2 px-3">연동공정</th>
                      <th className="py-2 px-3 text-right">ST(분)</th>
                      <th className="py-2 px-3 text-right">CAPA/hr</th>
                      <th className="py-2 px-3">비고/오류</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {parseResult.rows.map((row, idx) => (
                      <tr 
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-700'}
                      >
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              정상
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              오류
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-medium whitespace-nowrap">{row.equipmentType}</td>
                        <td className="py-1.5 px-3 font-mono whitespace-nowrap">{row.equipmentName || '-'}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">{row.itemType}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">{row.productType}</td>
                        <td className="py-1.5 px-3 font-semibold whitespace-nowrap text-blue-600 dark:text-blue-400">
                          {row.stage}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                          {row.stMinutesPerUnit}분
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                          {row.standardCapaPerHour || 10}
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 text-[10px] truncate max-w-[200px]">
                          {row.error || '정상 검증 완료'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parseResult ? (
              <span>반영 가능한 유효 레코드: <strong className="text-blue-600 font-mono">{parseResult.validCount}</strong>건</span>
            ) : (
              <span>데이터를 붙여넣어 검증을 시작하세요.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleApply}
              disabled={!parseResult || parseResult.validCount === 0 || isApplying}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer ${
                !parseResult || parseResult.validCount === 0 || isApplying
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
              <span>마스터데이터 일괄 반영하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
