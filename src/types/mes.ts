// MES Domain Types & Interfaces
export type ProcessStageName = 
  | '소재가공'
  | '1차가공'
  | '정밀가공'
  | 'ED'
  | 'EP'
  | 'CMP'
  | '세정'
  | '포장';

export const PROCESS_STAGES: ProcessStageName[] = [
  '소재가공',
  '1차가공',
  '정밀가공',
  'ED',
  'EP',
  'CMP',
  '세정',
  '포장'
];

export interface StageConfig {
  name: ProcessStageName;
  stageCode?: string;
  shortDesc: string;
  order: number;
  defaultSTMinutes: number;
  equipmentCategory: string;
  primaryWorkshop?: string;
  color: string;
}

export const STAGE_CONFIGS: Record<ProcessStageName, StageConfig> = {
  '소재가공': {
    name: '소재가공',
    stageCode: 'CORE (A004)',
    shortDesc: '워터젯/나노젯/소재밀링 원소재 정밀 절단',
    order: 1,
    defaultSTMinutes: 25,
    equipmentCategory: '워터젯/나노젯/밀링',
    primaryWorkshop: '5동-소재공정',
    color: 'emerald'
  },
  '1차가공': {
    name: '1차가공',
    stageCode: '면/외경가공 (A041, A057)',
    shortDesc: '횡로타리 면가공 1~2차 및 NC원통 외경연삭',
    order: 2,
    defaultSTMinutes: 45,
    equipmentCategory: '횡로타리/NC원통',
    primaryWorkshop: 'C2 1차가공 S 2',
    color: 'blue'
  },
  '정밀가공': {
    name: '정밀가공',
    stageCode: 'MCT/Drill (A008, A019, A065, A030, A032)',
    shortDesc: 'OKUMA MCT 5축 드릴/탭/키홀/내경/내단경 초정밀가공',
    order: 3,
    defaultSTMinutes: 180,
    equipmentCategory: 'OKUMA MCT/Drill M/C',
    primaryWorkshop: 'C2 CNC-S 3 MCT',
    color: 'indigo'
  },
  'ED': {
    name: 'ED',
    stageCode: '전착/에칭 (A040)',
    shortDesc: '저저항/일반저항 면 에칭 및 표면 피막처리',
    order: 4,
    defaultSTMinutes: 20,
    equipmentCategory: '에칭/전착반응조',
    primaryWorkshop: '2동-EP',
    color: 'violet'
  },
  'EP': {
    name: 'EP',
    stageCode: '단폴리싱 (A073)',
    shortDesc: '단 Polishing M/C 표면조도개선 및 외주 가공',
    order: 5,
    defaultSTMinutes: 120,
    equipmentCategory: '단 Polishing M/C',
    primaryWorkshop: '1동-단폴리싱',
    color: 'amber'
  },
  'CMP': {
    name: 'CMP',
    stageCode: '초평탄화 (A069)',
    shortDesc: 'CMP 4HEAD 화학기계적 초평탄 연마',
    order: 6,
    defaultSTMinutes: 30,
    equipmentCategory: 'CMP 4HEAD #5',
    primaryWorkshop: '2동-CP',
    color: 'orange'
  },
  '세정': {
    name: '세정',
    stageCode: '초음파세정 (A049)',
    shortDesc: 'RING 세정 1조 초순수 초음파 정밀세정',
    order: 7,
    defaultSTMinutes: 15,
    equipmentCategory: 'RING 세정 1조',
    primaryWorkshop: '2동-세정',
    color: 'cyan'
  },
  '포장': {
    name: '포장',
    stageCode: '검사/포장 (A025, A068)',
    shortDesc: '육안검사 1~3호 및 포장테이블 완제품 출하',
    order: 8,
    defaultSTMinutes: 15,
    equipmentCategory: '육안검사대/포장테이블',
    primaryWorkshop: '2동-세정/포장',
    color: 'teal'
  }
};

export type StepStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'delayed' | 'subcontracted';

export interface ProductionEventLog {
  id: string;
  category: '공정생산' | '작업장이동' | '측정등록' | '외주입출고';
  date: string;
  actionType: '완료' | '이동입고' | '이동출고' | '3D측정' | '제품저항측정' | '외주출고' | '외주입고';
  stepSeq?: number | null;
  processCode?: string | null;
  processName: string;
  equipmentCode?: string | null;
  equipmentName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  workerName: string;
  workshop: string;
  workshopFrom?: string | null;
  subcontractor?: string | null;
  statusText: string;
}

export interface ProcessStep {
  stage: ProcessStageName;
  stageCode?: string;
  order: number;
  status: StepStatus;
  plannedSTMinutes: number; // 표준시간(분)
  actualMinutes: number | null; // 실제 소요시간(분)
  startedAt: string | null;
  completedAt: string | null;
  firstInDate?: string | null; // 공정 최초 입고일
  lastOutDate?: string | null;  // 공정 최종 출고일
  assignedEquipmentId: string;
  assignedEquipmentCode?: string;
  assignedEquipmentName: string;
  workshop?: string;
  operatorId: string | null;
  operatorName: string | null;
  notes: string | null;
  defectCount: number;
  goodCount: number;
  subcontractor?: string | null;
  dwellDays?: number; // 공정 체류 기간 (일) - 실제 ST시간보다 많이 소요된 초과 체류시간 (일)
  dwellHours?: number; // 공정 체류 시간 (시간) - 실제 ST시간보다 많이 소요된 초과 체류시간 (시간)
  totalSpanDays?: number; // 공정 총 소요기간 (입고일~출고일)
  isLongRetention?: boolean; // 체류 기간 10일 이상 여부 (장기 체류 경보)
  dwellAlertReason?: string | null; // 장기 체류 알람 사유
  measurements?: {
    resistanceCheck?: string;
    threeDCheck?: string;
  };
}

export interface InterStageTransit {
  id: string;
  sessionOrder: number;     // 1 to 7 이동중 세션 순서
  fromStage: ProcessStageName;
  toStage: ProcessStageName;
  fromWorkshop: string;
  toWorkshop: string;
  startDate: string | null; // 출고일
  endDate: string | null;   // 입고일
  transitDays: number;      // 이동/대차 체류 기간 (일)
  transitHours: number;     // 이동/대차 체류 시간 (시간)
  isLongRetention: boolean; // 10일 이상 장기 이동/대기 체류 여부
  subcontractor?: string | null;
  status: 'pending' | 'in_transit' | 'completed';
  notes?: string;
}

export type OrderPriority = 'normal' | 'high' | 'urgent';
export type OrderStatus = 'scheduled' | 'in_progress' | 'delayed' | 'completed';

export interface LTExclusionRecord {
  id: string;
  action: 'exclude' | 'resume';
  date: string;
  reason: string;
  excludedDays?: number;
  actor: string;
  notes?: string;
}

export interface DailySimulationState {
  date: string;
  stage: ProcessStageName | '완료' | '외주가공' | '입고전' | '이동중';
  workshop: string;
  statusText: string;
  isOutsourced: boolean;
  isInTransit: boolean;
  transitSessionId?: string | null; // 이동중 세션 ID (e.g. TR-01: 소재➔1차가공)
  transitRoute?: string | null; // 이동 경로 (From ➔ To)
  activeEquipment?: string | null;
  stageDwellDaysOnDate?: number; // 해당 일자 기준 공정 체류 일수 (ST 초과 체류시간)
  isLongRetentionOnDate?: boolean; // 해당 일자 기준 10일 이상 장기 체류 경고
}

export interface WorkOrder {
  id: string;
  barcode?: string;      // 작업의뢰서바코드 (e.g., 100247158, 100245528)
  orderNumber: string;   // 작업의뢰서번호 (e.g., WO-100247158)
  productCode: string;   // 제품코드 (e.g., PYLR2-230066A, PSLR2-230066A)
  productName: string;   // 제품명 (e.g., Flex HxP Outer Ring, Talon Outer Electrode)
  itemType: string;      // 품목종류 (반도체 링, 전극 부품 등)
  productType: string;   // 재질/종류 (실리콘/세라믹/석영)
  quantity: number;      // 의뢰 수량
  dueDate: string;       // 납기일
  createdAt: string;     // 등록일자
  priority: OrderPriority;
  customer: string;      // 고객사
  currentStageIndex: number; // 0..7 (8 = 완료)
  currentWorkshop?: string | null;  // 현재 위치 작업장 (e.g., 5동-소재공정, C2 1차가공 S 2, 2동-CP, 2동-세정)
  currentStatusText?: string | null; // 창고입고, 이동중, 공정중, 외주재고, 완제품처리
  subcontractor?: string | null;    // 외주업체명 (주식회사 에스와이텍, 주식회사 온테크놀로지)
  subcontractorOutDate?: string | null; // 외주 출고일자
  subcontractorInDate?: string | null;  // 외주 입고일자
  subcontractorLeadDays?: number | null; // 외주 체류일수(일)
  subcontractorProcesses?: string[] | null; // 외주 가공 공정 항목
  subcontractorStatus?: '대기' | '외주가공중' | '입고검사중' | '입고완료' | '해당없음' | null;
  status: OrderStatus;
  overallProgress: number;   // 0..100%
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  // ST & LT 소요시간 분리 관리 필드
  netSTMinutes?: number;      // 순수 실제 가공 ST 시간(분)
  transferMinutes?: number;  // 공정간 작업장이동 소요시간(분)
  queueMinutes?: number;     // 창고/공정 버퍼 대기시간(분)
  totalLeadTimeHours?: number;// 총 LT 소요시간(시간)
  leadTimeDays?: number;     // 총 LT 일수(일)
  adjustedLeadTimeDays?: number; // LT 제외일수 차감 후 실제 인정 LT(일)
  // LT 초과 제외 및 재개 관리
  isLTExcluded?: boolean;    // LT 제외 여부
  ltExclusionReason?: string | null; // LT 제외 사유
  ltExclusionDays?: number;  // 제외 적용 일수
  ltExclusionDate?: string | null;  // 제외 처리일시
  ltExclusionHistory?: LTExclusionRecord[]; // 제외/재개 이력
  dailyTimeline?: Record<string, DailySimulationState>; // 10/01~10/31 일자별 시뮬레이션 상태
  // 공정별 10일 초과 장기 체류 관리
  hasLongRetentionAlert?: boolean; // 10일 초과 장기 체류 공정 존재 여부
  maxStageDwellDays?: number; // 최대 공정 체류 일수 (일)
  longRetentionStageName?: ProcessStageName | null; // 장기 체류 발생 공정명
  steps: ProcessStep[];
  interStageTransits?: InterStageTransit[]; // 공정과 공정 사이 7개 이동중 상세 정보
  historyLogs?: ProductionEventLog[];
  notes?: string | null;
}

export interface EquipmentItem {
  id: string;
  equipmentCode?: string; // e.g. PR-WJ-001, PR-OK-511, PR-PL-010
  equipmentType: string; // e.g. 워터젯, OKUMA MCT, CMP 4HEAD
  equipmentName: string; // e.g. 워터젯 #1, OKUMA MCT#11
  linkedProcess: ProcessStageName;
  workshop?: string;
  status: 'idle' | 'running' | 'maintenance' | 'bottleneck';
  currentOrderId?: string | null;
  utilizationRate: number;
  standardCapaPerHour: number;
  location: string;
}

export interface STMasterRule {
  id: string;
  equipmentCode?: string;
  equipmentType: string;
  itemType: string;
  productType: string;
  stage: ProcessStageName;
  stageCode?: string;
  stMinutesPerUnit: number;
  setupMinutes: number;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'process_completed' | 'delay_warning' | 'bottleneck_alert' | 'system_info' | 'order_created';
  title: string;
  message: string;
  workOrderId?: string;
  orderNumber?: string;
  barcode?: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export type UserRole = 'admin' | 'worker' | 'viewer';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  assignedStage?: ProcessStageName;
  assignedWorkshop?: string;
  department: string;
}

export type AuditActionType = 
  | 'LOGIN' 
  | 'PROCESS_START' 
  | 'PROCESS_COMPLETE' 
  | 'MEASUREMENT_RECORD'
  | 'ORDER_CREATE' 
  | 'ORDER_UPDATE' 
  | 'LT_EXCLUDE'
  | 'LT_RESUME'
  | 'OUTSOURCING_STATUS_CHANGE'
  | 'MASTER_PASTE_UPDATE' 
  | 'ROLE_SWITCH' 
  | 'EXPORT_DATA';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: AuditActionType;
  target: string;
  details: string;
  ipAddress: string;
}

export interface BottleneckAnalysis {
  stage: ProcessStageName;
  stageCode?: string;
  plannedAvgST: number;
  actualAvgTime: number;
  stDeviationRatio: number;
  activeWaitingCount: number;
  inProgressCount: number;
  delayRatePercent: number;
  isBottleneck: boolean;
  severity: 'normal' | 'warning' | 'critical';
  primaryEquipment?: string;
  workshop?: string;
  recommendation: string;
  // 공정별 ST vs 체류시간 비교 지표
  avgDwellDays?: number; // 공정 평균 체류 일수 (일)
  avgSTHours?: number; // 공정 평균 실제 ST 가공시간 (시간)
  stVsDwellRatio?: number; // ST 대비 체류시간 배율 (체류시간 / ST시간)
  longRetentionCount?: number; // 10일 초과 장기 체류 발생 건수
}
