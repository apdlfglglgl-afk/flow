import React, { useState, useEffect } from 'react';
import { 
  WorkOrder, 
  EquipmentItem, 
  STMasterRule, 
  NotificationItem, 
  AuditLog, 
  UserRole, 
  ProcessStageName, 
  PROCESS_STAGES, 
  STAGE_CONFIGS 
} from './types/mes';
import {
  INITIAL_USER,
  INITIAL_EQUIPMENT,
  INITIAL_ST_RULES,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from './data/initialData';
import { ALL_WORK_ORDERS_25 } from './data/allWorkOrders25';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { ProcessPipelineVisualizer } from './components/ProcessPipelineVisualizer';
import { WorkOrderTable } from './components/WorkOrderTable';
import { BottleneckReportView } from './components/BottleneckReportView';
import { OutsourcingDashboardView } from './components/OutsourcingDashboardView';
import { OctoberTimelineSimulator } from './components/OctoberTimelineSimulator';
import { LTExclusionModal } from './components/LTExclusionModal';
import { ClipboardSyncModal } from './components/ClipboardSyncModal';
import { WorkOrderDetailModal } from './components/WorkOrderDetailModal';
import { NewOrderModal } from './components/NewOrderModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuditLogView } from './components/AuditLogView';
import { CheckCircle2, AlertTriangle, Info, Bell, RotateCcw } from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mes_dark_mode') === 'true';
  });

  // Role state (RBAC): admin, worker, viewer
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('mes_user_role') as UserRole) || 'admin';
  });

  // Current active tab
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Core Data States with localStorage persistence (v3 for 25 work orders & October timeline)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    const saved = localStorage.getItem('mes_work_orders_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 25 && parsed[0].barcode) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return ALL_WORK_ORDERS_25;
  });

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(() => {
    const saved = localStorage.getItem('mes_equipment_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].equipmentCode) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_EQUIPMENT;
  });

  const [stRules, setStRules] = useState<STMasterRule[]>(() => {
    const saved = localStorage.getItem('mes_st_rules_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_ST_RULES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('mes_notifications_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('mes_audit_logs_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Selected filters & modals
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<ProcessStageName | 'all'>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<WorkOrder | null>(null);
  const [selectedLTExclusionOrder, setSelectedLTExclusionOrder] = useState<WorkOrder | null>(null);
  const [isLTExclusionModalOpen, setIsLTExclusionModalOpen] = useState<boolean>(false);
  const [isClipboardModalOpen, setIsClipboardModalOpen] = useState<boolean>(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);

  // Transient Toast Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mes_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Persist states
  useEffect(() => {
    localStorage.setItem('mes_work_orders_v3', JSON.stringify(workOrders));
  }, [workOrders]);

  useEffect(() => {
    localStorage.setItem('mes_equipment_v2', JSON.stringify(equipmentList));
  }, [equipmentList]);

  useEffect(() => {
    localStorage.setItem('mes_st_rules_v2', JSON.stringify(stRules));
  }, [stRules]);

  useEffect(() => {
    localStorage.setItem('mes_notifications_v2', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('mes_audit_logs_v2', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (
    action: AuditLog['action'],
    target: string,
    details: string,
    roleOverride?: UserRole
  ) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: userRole === 'admin' ? 'USR-ADM-01' : 'OP-정진현',
      userName: userRole === 'admin' ? '박성민 생산총괄팀장' : '정진현 선임작업자',
      role: roleOverride || userRole,
      action,
      target,
      details,
      ipAddress: '192.168.10.15'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addNotification = (
    type: NotificationItem['type'],
    title: string,
    message: string,
    severity: NotificationItem['severity'],
    workOrderId?: string,
    orderNumber?: string
  ) => {
    const newNoti: NotificationItem = {
      id: `NOTI-${Date.now()}`,
      type,
      title,
      message,
      workOrderId,
      orderNumber,
      timestamp: new Date().toISOString(),
      read: false,
      severity
    };
    setNotifications(prev => [newNoti, ...prev]);
  };

  // Role Change Handler
  const handleRoleChange = (newRole: UserRole) => {
    setUserRole(newRole);
    localStorage.setItem('mes_user_role', newRole);
    addAuditLog('ROLE_SWITCH', `사용자 권한: ${newRole}`, `시스템 접근 권한을 '${newRole}'(으)로 변경`);
    showToast(`권한이 '${newRole === 'admin' ? '관리자' : newRole === 'worker' ? '현장 작업자' : '조회자'}' 모드로 전환되었습니다.`, 'info');
  };

  // Reset to initial factory demo seed
  const handleResetToRealSeeds = () => {
    if (confirm('전체 25개 공정 실적 및 10월 시뮬레이션 데이터셋으로 초기화하시겠습니까?')) {
      setWorkOrders(ALL_WORK_ORDERS_25);
      setEquipmentList(INITIAL_EQUIPMENT);
      setStRules(INITIAL_ST_RULES);
      setNotifications(INITIAL_NOTIFICATIONS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      localStorage.removeItem('mes_work_orders_v2');
      localStorage.removeItem('mes_work_orders_v3');
      localStorage.removeItem('mes_equipment_v2');
      localStorage.removeItem('mes_st_rules_v2');
      localStorage.removeItem('mes_notifications_v2');
      localStorage.removeItem('mes_audit_logs_v2');
      showToast('전체 25개 작업지시서 실적 데이터셋으로 성공적으로 복원되었습니다.', 'success');
    }
  };

  // Apply LT Exclusion
  const handleApplyLTExclusion = (
    orderId: string, 
    reason: string, 
    excludedDays: number, 
    notes: string
  ) => {
    const nowStr = new Date().toISOString();
    setWorkOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== orderId) return order;
        const totalDays = order.leadTimeDays || 0;
        const adjDays = Math.max(0.5, totalDays - excludedDays);
        const newRecord = {
          id: `EX-${Date.now()}`,
          action: 'exclude' as const,
          date: nowStr,
          reason,
          excludedDays,
          actor: userRole === 'admin' ? '박성민 생산총괄팀장' : '정진현 선임작업자',
          notes
        };

        return {
          ...order,
          isLTExcluded: true,
          ltExclusionReason: reason,
          ltExclusionDays: excludedDays,
          ltExclusionDate: nowStr,
          adjustedLeadTimeDays: Math.round(adjDays * 10) / 10,
          ltExclusionHistory: [...(order.ltExclusionHistory || []), newRecord]
        };
      });
    });

    const target = workOrders.find(o => o.id === orderId);
    const orderNo = target ? target.orderNumber : orderId;

    addAuditLog(
      'LT_EXCLUDE',
      orderNo,
      `LT 제외 ${excludedDays}일 차감 승인 (사유: ${reason})`
    );

    addNotification(
      'system_info',
      `[${orderNo}] LT 제외 ${excludedDays}일 차감 승인`,
      `사유: ${reason}. 실인정 LT가 재산출되었습니다.`,
      'info',
      orderId,
      orderNo
    );

    showToast(`[${orderNo}] LT 제외 ${excludedDays}일 차감이 승인되었습니다.`, 'success');
  };

  // Resume normal LT
  const handleResumeLT = (orderId: string, resumeNotes: string) => {
    const nowStr = new Date().toISOString();
    setWorkOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== orderId) return order;
        const newRecord = {
          id: `RES-${Date.now()}`,
          action: 'resume' as const,
          date: nowStr,
          reason: '정상 LT 집계 복원',
          actor: userRole === 'admin' ? '박성민 생산총괄팀장' : '정진현 선임작업자',
          notes: resumeNotes
        };

        return {
          ...order,
          isLTExcluded: false,
          adjustedLeadTimeDays: order.leadTimeDays,
          ltExclusionHistory: [...(order.ltExclusionHistory || []), newRecord]
        };
      });
    });

    const target = workOrders.find(o => o.id === orderId);
    const orderNo = target ? target.orderNumber : orderId;

    addAuditLog(
      'LT_RESUME',
      orderNo,
      `LT 정상 집계 재개 (비고: ${resumeNotes})`
    );

    addNotification(
      'system_info',
      `[${orderNo}] 정상 LT 집계 복원 완료`,
      `비고: ${resumeNotes}. 통상 리드타임 관리로 복원되었습니다.`,
      'success',
      orderId,
      orderNo
    );

    showToast(`[${orderNo}] 정상 LT 집계로 복원되었습니다.`, 'success');
  };

  // Start Step handler (from Operator Kiosk or Table)
  const handleStartStep = (orderId: string, stage: ProcessStageName, operatorName: string) => {
    const now = new Date().toISOString();

    setWorkOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== orderId) return order;

        const updatedSteps = order.steps.map(step => {
          if (step.stage === stage) {
            return {
              ...step,
              status: 'in_progress' as const,
              startedAt: now,
              operatorName,
              operatorId: 'OP-정진현'
            };
          }
          return step;
        });

        return {
          ...order,
          status: 'in_progress',
          steps: updatedSteps
        };
      });
    });

    const targetOrder = workOrders.find(o => o.id === orderId);
    const orderNo = targetOrder ? targetOrder.orderNumber : orderId;

    addAuditLog('PROCESS_START', `${orderNo} / ${stage}`, `작업자 ${operatorName}님이 '${stage}' 공정을 시작했습니다.`);
    addNotification('system_info', `[${orderNo}] '${stage}' 공정 시작`, `작업자 ${operatorName}님이 작업을 시작했습니다.`, 'info', orderId, orderNo);
    showToast(`[${orderNo}] '${stage}' 공정이 시작되었습니다.`, 'success');
  };

  // Complete Step handler (from Operator Kiosk or Modal)
  const handleCompleteStep = (
    orderId: string,
    stage: ProcessStageName,
    operatorName: string,
    actualMinutes: number,
    defectCount: number,
    notes: string
  ) => {
    const now = new Date().toISOString();

    setWorkOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== orderId) return order;

        const stepIdx = order.steps.findIndex(s => s.stage === stage);
        if (stepIdx === -1) return order;

        const goodCount = Math.max(0, order.quantity - defectCount);

        // Update current step to completed
        const updatedSteps = [...order.steps];
        updatedSteps[stepIdx] = {
          ...updatedSteps[stepIdx],
          status: 'completed',
          actualMinutes,
          completedAt: now,
          operatorName,
          defectCount,
          goodCount,
          notes
        };

        // Check if there is a next step
        const nextIdx = stepIdx + 1;
        let nextStageIndex = nextIdx;
        let newOrderStatus = order.status;
        let overallProgress = Math.round(((stepIdx + 1) / PROCESS_STAGES.length) * 100);

        if (nextIdx < PROCESS_STAGES.length) {
          // Promote next step to ready
          updatedSteps[nextIdx] = {
            ...updatedSteps[nextIdx],
            status: 'ready'
          };
        } else {
          // All 8 steps completed!
          newOrderStatus = 'completed';
          overallProgress = 100;
        }

        const totalActual = updatedSteps.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

        return {
          ...order,
          currentStageIndex: nextStageIndex,
          status: newOrderStatus,
          overallProgress,
          totalActualMinutes: totalActual,
          steps: updatedSteps
        };
      });
    });

    const targetOrder = workOrders.find(o => o.id === orderId);
    const orderNo = targetOrder ? targetOrder.orderNumber : orderId;
    const currentStepIndex = PROCESS_STAGES.indexOf(stage);
    const nextStageName = currentStepIndex < PROCESS_STAGES.length - 1 ? PROCESS_STAGES[currentStepIndex + 1] : null;

    addAuditLog(
      'PROCESS_COMPLETE',
      `${orderNo} / ${stage}`,
      `'${stage}' 공정 완료 기록 (소요시간: ${actualMinutes}분, 양품: ${targetOrder?.quantity ? targetOrder.quantity - defectCount : 0}EA, 불량: ${defectCount}EA)`
    );

    if (nextStageName) {
      addNotification(
        'process_completed',
        `[${orderNo}] '${stage}' 완료 → 다음 공정 '${nextStageName}' 대기`,
        `'${stage}' 공정이 성공적으로 완료되었습니다. 다음 공정인 '${nextStageName}'(으)로 자동 인계되었습니다.`,
        'success',
        orderId,
        orderNo
      );
      showToast(`[${orderNo}] '${stage}' 완료! 다음 공정 '${nextStageName}' 대기 상태로 자동 인계되었습니다.`, 'success');
    } else {
      addNotification(
        'process_completed',
        `[${orderNo}] 전 8단계 공정 완료 및 최종 출하 승인`,
        `모든 공정(포장 완료)이 완료되어 최종 출하 준비 상태로 전환되었습니다.`,
        'success',
        orderId,
        orderNo
      );
      showToast(`축하합니다! [${orderNo}] 8단계 공정이 모두 완료되어 출하 승인되었습니다.`, 'success');
    }
  };

  // Force advance order step (from detail modal)
  const handleAdvanceOrderStep = (orderId: string) => {
    const targetOrder = workOrders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const currentStep = targetOrder.steps[targetOrder.currentStageIndex];
    if (!currentStep) return;

    handleCompleteStep(
      orderId,
      currentStep.stage,
      userRole === 'admin' ? '관리자 강제승인' : '정진현 선임',
      currentStep.plannedSTMinutes,
      0,
      '관리자 검토 후 다음 공정으로 강제 이송 처리됨'
    );
  };

  // Clipboard sync applied
  const handleApplyClipboardSync = (
    updatedRules: STMasterRule[],
    updatedEquipment: EquipmentItem[],
    summaryText: string
  ) => {
    setStRules(updatedRules);
    setEquipmentList(updatedEquipment);

    addAuditLog('MASTER_PASTE_UPDATE', '설비 및 ST 마스터데이터', summaryText);
    addNotification('system_info', '클립보드 마스터데이터 동기화 완료', summaryText, 'info');
    showToast(summaryText, 'success');
  };

  // Create new order
  const handleCreateOrder = (newOrder: WorkOrder) => {
    setWorkOrders(prev => [newOrder, ...prev]);
    addAuditLog('ORDER_CREATE', newOrder.orderNumber, `신규 의뢰서 등록: ${newOrder.productName} (${newOrder.quantity} EA)`);
    addNotification('order_created', `[${newOrder.orderNumber}] 신규 작업의뢰서 접수`, `${newOrder.productName} ${newOrder.quantity} EA 의뢰서가 등록되었습니다.`, 'info', newOrder.id, newOrder.orderNumber);
    showToast(`신규 작업의뢰서 [${newOrder.orderNumber}]가 성공적으로 등록되었습니다.`, 'success');
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
        onOpenClipboardSync={() => setIsClipboardModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Strip (Always shown for quick visibility) */}
        <OverviewStats
          workOrders={workOrders}
          equipmentList={equipmentList}
          onSelectFilter={() => {
            setCurrentTab('orders');
          }}
        />

        {/* Tab 1: Overview & Pipeline Tracker */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            <ProcessPipelineVisualizer
              workOrders={workOrders}
              equipmentList={equipmentList}
              selectedStage={selectedPipelineStage}
              onSelectStage={setSelectedPipelineStage}
              onSelectOrder={(order) => setSelectedOrderDetail(order)}
            />

            <WorkOrderTable
              workOrders={workOrders}
              selectedStage={selectedPipelineStage}
              onSelectStage={setSelectedPipelineStage}
              onSelectOrder={(order) => setSelectedOrderDetail(order)}
              onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
              onOpenLTExclusion={(order) => {
                setSelectedLTExclusionOrder(order);
                setIsLTExclusionModalOpen(true);
              }}
              canEdit={userRole === 'admin' || userRole === 'worker'}
            />
          </div>
        )}

        {/* Tab 2: Work Orders Only (25건 전체) */}
        {currentTab === 'orders' && (
          <WorkOrderTable
            workOrders={workOrders}
            selectedStage={selectedPipelineStage}
            onSelectStage={setSelectedPipelineStage}
            onSelectOrder={(order) => setSelectedOrderDetail(order)}
            onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
            onOpenLTExclusion={(order) => {
              setSelectedLTExclusionOrder(order);
              setIsLTExclusionModalOpen(true);
            }}
            canEdit={userRole === 'admin' || userRole === 'worker'}
          />
        )}

        {/* Tab 3: Dedicated Outsourcing Dashboard (외주 관리) */}
        {currentTab === 'outsourcing' && (
          <OutsourcingDashboardView
            orders={workOrders}
            currentUserRole={userRole}
            onSelectOrder={(order) => setSelectedOrderDetail(order)}
            onOpenLTExclusion={(order) => {
              setSelectedLTExclusionOrder(order);
              setIsLTExclusionModalOpen(true);
            }}
          />
        )}

        {/* Tab 4: October 1-31 Flow Simulator (10월 일자별 시뮬레이션) */}
        {currentTab === 'simulator' && (
          <OctoberTimelineSimulator
            orders={workOrders}
            onSelectOrder={(order) => setSelectedOrderDetail(order)}
          />
        )}

        {/* Tab 5: ST/LT Analysis & Bottleneck Report */}
        {currentTab === 'bottleneck' && (
          <BottleneckReportView
            workOrders={workOrders}
            equipmentList={equipmentList}
            onSelectOrder={(order) => setSelectedOrderDetail(order)}
            onOpenLTExclusion={(order) => {
              setSelectedLTExclusionOrder(order);
              setIsLTExclusionModalOpen(true);
            }}
          />
        )}

        {/* Tab 6: Audit Log View */}
        {currentTab === 'audit' && (
          <AuditLogView
            logs={auditLogs}
            userRole={userRole}
            onClearLogs={() => setAuditLogs([])}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Smart MES Production Scheduler</span>
            <span aria-hidden="true">·</span>
            <span>25개 작업지시서 전체 분석 & 외주 관리 및 10월 공정 시뮬레이터</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetToRealSeeds}
              className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="초기 25개 실적 데이터로 리셋"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>전체 25개 데이터 복원</span>
            </button>
            <span>데이터 보안 RBAC 적용됨 · 권한: {userRole === 'admin' ? '관리자' : userRole === 'worker' ? '작업자' : '조회자'}</span>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedOrderDetail && (
        <WorkOrderDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
          onAdvanceOrderStep={handleAdvanceOrderStep}
          onOpenLTExclusion={(order) => {
            setSelectedLTExclusionOrder(order);
            setIsLTExclusionModalOpen(true);
          }}
          canEdit={userRole === 'admin' || userRole === 'worker'}
        />
      )}

      {/* LT Exclusion & Resume Modal */}
      {selectedLTExclusionOrder && (
        <LTExclusionModal
          order={selectedLTExclusionOrder}
          currentUser={{
            id: userRole === 'admin' ? 'USR-ADM-01' : 'OP-정진현',
            name: userRole === 'admin' ? '박성민 생산총괄팀장' : '정진현 선임작업자',
            role: userRole,
            department: '생산운영본부'
          }}
          isOpen={isLTExclusionModalOpen}
          onClose={() => {
            setIsLTExclusionModalOpen(false);
            setSelectedLTExclusionOrder(null);
          }}
          onApplyExclusion={handleApplyLTExclusion}
          onResumeLT={handleResumeLT}
        />
      )}

      {/* Clipboard Sync Modal */}
      <ClipboardSyncModal
        isOpen={isClipboardModalOpen}
        onClose={() => setIsClipboardModalOpen(false)}
        currentRules={stRules}
        currentEquipment={equipmentList}
        onApplySync={handleApplyClipboardSync}
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        stRules={stRules}
        equipmentList={equipmentList}
        nextOrderNumber={`WO-10024${Math.floor(9200 + Math.random() * 800)}`}
        onCreateOrder={handleCreateOrder}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }}
        onMarkAllAsRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
        onClearAll={() => setNotifications([])}
        onSelectOrderById={(id) => {
          const found = workOrders.find(o => o.id === id);
          if (found) setSelectedOrderDetail(found);
        }}
      />
    </div>
  );
}
