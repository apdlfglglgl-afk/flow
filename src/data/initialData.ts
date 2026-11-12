import {
  WorkOrder,
  EquipmentItem,
  STMasterRule,
  NotificationItem,
  AuditLog,
  UserProfile,
  PROCESS_STAGES
} from '../types/mes';
import {
  REAL_EQUIPMENT_MASTER,
  REAL_ST_MASTER_RULES
} from './realProductionData';
import { ALL_WORK_ORDERS_25 } from './allWorkOrders25';

export const INITIAL_USER: UserProfile = {
  id: 'USR-ADM-01',
  name: '박성민 생산총괄팀장',
  role: 'admin',
  department: '생산기획 & MES 운영본부'
};

export const INITIAL_EQUIPMENT: EquipmentItem[] = REAL_EQUIPMENT_MASTER;

export const INITIAL_ST_RULES: STMasterRule[] = REAL_ST_MASTER_RULES;

export const INITIAL_WORK_ORDERS: WorkOrder[] = ALL_WORK_ORDERS_25;

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTI-01',
    type: 'bottleneck_alert',
    title: 'C2 CNC OKUMA MCT#11 설비 병목 경보',
    message: '[PR-OK-511] OKUMA MCT#11 설비 부하율 97% 도달 및 정밀가공 대기 링 부품 3건 누적. 1작업당 평균 6~12시간 소요.',
    workOrderId: 'WO-100249112',
    orderNumber: 'WO-100249112',
    timestamp: '2026-10-28T09:30:00Z',
    read: false,
    severity: 'critical'
  },
  {
    id: 'NOTI-02',
    type: 'delay_warning',
    title: '납기 임박 및 단폴리싱 외주 일정 지연 경보',
    message: '[WO-100249112] Flex HxP Outer Ring (바코드: 100249112) - 납기일 2026-10-31 대비 5동/C2동 잔여 공정 긴급 가속화 필요.',
    workOrderId: 'WO-100249112',
    orderNumber: 'WO-100249112',
    timestamp: '2026-10-28T08:15:00Z',
    read: false,
    severity: 'warning'
  },
  {
    id: 'NOTI-03',
    type: 'process_completed',
    title: '외주가공 입고 완료 및 3차원 측정 등록',
    message: '[WO-100240286] 주식회사 에스와이텍 외주 면/외경/MCT 가공품 수입검사실 입고 완료 -> 2동 저항측정 및 에칭 공정 자동 인계.',
    workOrderId: 'WO-100240286',
    orderNumber: 'WO-100240286',
    timestamp: '2026-10-22T15:57:35Z',
    read: true,
    severity: 'success'
  },
  {
    id: 'NOTI-04',
    type: 'process_completed',
    title: '전 공정 100% 완료 및 완제품 출하 승인',
    message: '[WO-100247158] Flex HxP Outer Ring (25 EA) - 2동 포장테이블(PR-ZZ-014) 최종 질소 진공포장 완료 및 출하 라벨 발행.',
    workOrderId: 'WO-100247158',
    orderNumber: 'WO-100247158',
    timestamp: '2026-10-20T17:16:08Z',
    read: true,
    severity: 'success'
  },
  {
    id: 'NOTI-05',
    type: 'order_created',
    title: '신규 작업의뢰서 접수 (소재가공 대기)',
    message: '[WO-100248901] Talon Outer Electrode (20 EA) 작업의뢰서 접수 완료. 5동-소재공정 워터젯(PR-WJ-002) 블랭킹 대기.',
    workOrderId: 'WO-100248901',
    orderNumber: 'WO-100248901',
    timestamp: '2026-10-27T08:00:00Z',
    read: true,
    severity: 'info'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-10-28T09:35:10Z',
    userId: 'OP-정진현',
    userName: '정진현 선임',
    role: 'worker',
    action: 'PROCESS_START',
    target: 'WO-100249112 / 정밀가공',
    details: 'C2 CNC-S 3 MCT동 PR-OK-511 (OKUMA MCT#11) 바코드 100249112 스캔 및 내단경/탭 가공 착수',
    ipAddress: '192.168.10.45'
  },
  {
    id: 'LOG-002',
    timestamp: '2026-10-27T14:15:20Z',
    userId: 'OP-조수진',
    userName: '조수진 기장',
    role: 'worker',
    action: 'PROCESS_COMPLETE',
    target: 'WO-100240286 / EP',
    details: '1동-단폴리싱 PR-PL-021 (단 Polishing M/C #8) 단차 경면연마 완료 (435분 소요, 양품 30 EA)',
    ipAddress: '192.168.10.88'
  },
  {
    id: 'LOG-003',
    timestamp: '2026-10-22T16:00:15Z',
    userId: 'USR-ADM-01',
    userName: '박성민 생산총괄팀장',
    role: 'admin',
    action: 'ORDER_UPDATE',
    target: 'WO-100240286 (외주관리)',
    details: '주식회사 에스와이텍 외주입고 승인 및 3동 수입검사창고 입고 상태 확인',
    ipAddress: '10.200.4.15'
  },
  {
    id: 'LOG-004',
    timestamp: '2026-10-20T17:16:10Z',
    userId: 'OP-구정희',
    userName: '구정희 조장',
    role: 'worker',
    action: 'PROCESS_COMPLETE',
    target: 'WO-100247158 / 포장',
    details: '2동-세정/포장 PR-ZZ-014 클린룸 포장테이블 진공포장 완료 및 완제품처리 전환',
    ipAddress: '192.168.12.14'
  },
  {
    id: 'LOG-005',
    timestamp: '2026-10-16T21:21:10Z',
    userId: 'OP-박지윤',
    userName: '박지윤 연구원',
    role: 'worker',
    action: 'MEASUREMENT_RECORD',
    target: 'WO-100247158 (C2-측정)',
    details: 'PR-ME-504 접촉식 3차원 CMM 측정 완료 - 평탄도 0.008mm, 동심도 0.012mm 전수 합격',
    ipAddress: '192.168.10.54'
  },
  {
    id: 'LOG-006',
    timestamp: '2026-10-15T09:00:00Z',
    userId: 'USR-ADM-01',
    userName: '박성민 생산총괄팀장',
    role: 'admin',
    action: 'MASTER_PASTE_UPDATE',
    target: '설비 마스터 및 ST 공수',
    details: '현장 실적 기반 OKUMA MCT, 단 Polishing, CMP 4HEAD ST 마스터 데이터 일괄 동기화',
    ipAddress: '10.200.4.15'
  }
];
