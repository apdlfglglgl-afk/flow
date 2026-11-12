import React, { useState } from 'react';
import { AuditLog, UserRole } from '../types/mes';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
  userRole: UserRole;
  onClearLogs?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  userRole,
  onClearLogs
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        log.userName.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (roleFilter !== 'all' && log.role !== roleFilter) return false;

    return true;
  });

  const handleExportCSV = () => {
    const headers = ['로그ID', '발생시각', '사용자명', '사용자ID', '권한', '작업구분', '대상객체', '상세내용', '접속IP'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      `"${l.userName}"`,
      l.userId,
      l.role,
      l.action,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MES_시스템보안_접근감사로그_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                시스템 보안 및 접근 권한 감사 로그 (Security Audit Log)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              사용자 권한별 로그인, 공정 시작/완료 실적 등록, 클립보드 마스터데이터 동기화 및 스케쥴 변경 내역을 실시간으로 추적 보존합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>감사로그 CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사용자명, 대상 의뢰서, 작업내용 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">전체 작업 구분 (Action)</option>
              <option value="PROCESS_START">공정 시작 (PROCESS_START)</option>
              <option value="PROCESS_COMPLETE">공정 완료 (PROCESS_COMPLETE)</option>
              <option value="ORDER_CREATE">의뢰서 신규 등록 (ORDER_CREATE)</option>
              <option value="MASTER_PASTE_UPDATE">클립보드 동기화 (MASTER_PASTE_UPDATE)</option>
              <option value="ROLE_SWITCH">권한 전환 (ROLE_SWITCH)</option>
              <option value="LOGIN">로그인 (LOGIN)</option>
            </select>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">사용자 권한 전체</option>
              <option value="admin">관리자 (Admin)</option>
              <option value="worker">현장 작업자 (Worker)</option>
              <option value="viewer">조회자 (Viewer)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 whitespace-nowrap">발생 시각</th>
                <th className="py-2.5 px-4 whitespace-nowrap">사용자 정보</th>
                <th className="py-2.5 px-4 whitespace-nowrap">권한</th>
                <th className="py-2.5 px-4 whitespace-nowrap">작업 구분</th>
                <th className="py-2.5 px-4 whitespace-nowrap">대상 객체</th>
                <th className="py-2.5 px-4">세부 활동 기록</th>
                <th className="py-2.5 px-4 whitespace-nowrap">접속 단말 IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    검색 조건에 해당하는 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </td>

                      {/* User Name */}
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        <div>{log.userName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.userId}</div>
                      </td>

                      {/* Role */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          log.role === 'admin'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : log.role === 'worker'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {log.role === 'admin' ? '관리자' : log.role === 'worker' ? '작업자' : '조회자'}
                        </span>
                      </td>

                      {/* Action Type */}
                      <td className="py-2.5 px-4 font-mono font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">
                        {log.action}
                      </td>

                      {/* Target */}
                      <td className="py-2.5 px-4 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {log.target}
                      </td>

                      {/* Details */}
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-[360px]">
                        {log.details}
                      </td>

                      {/* IP */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ipAddress}
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
