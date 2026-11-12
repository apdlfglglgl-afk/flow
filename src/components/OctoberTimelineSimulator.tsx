import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Building2, 
  Truck, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  Gauge
} from 'lucide-react';
import { WorkOrder, ProcessStageName, DailySimulationState } from '../types/mes';

interface OctoberTimelineSimulatorProps {
  orders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
}

export const SIMULATION_STATIONS = [
  { id: '5동-소재공정', name: '01 소재가공 (5동)', desc: '워터젯 / 나노젯 원소재 절단', type: 'stage', stageName: '소재가공', color: 'emerald' },
  { id: 'TR-01', name: '🚚 이동중 1 (5동➔C2)', desc: '소재가공 출고 ➔ C2 1차가공실 대차 이송', type: 'transit', from: '소재가공', to: '1차가공', color: 'amber' },
  { id: 'C2 1차가공 S 2', name: '02 1차가공 (C2)', desc: '횡로타리 면가공 / NC원통 연삭', type: 'stage', stageName: '1차가공', color: 'blue' },
  { id: 'TR-02', name: '🚚 이동중 2 (1차➔정밀)', desc: '1차가공 ➔ OKUMA MCT/Drill 대차 이송', type: 'transit', from: '1차가공', to: '정밀가공', color: 'amber' },
  { id: 'C2 CNC-S 3 MCT', name: '03 정밀가공 (C2)', desc: 'OKUMA 5축 초정밀 MCT/드릴링', type: 'stage', stageName: '정밀가공', color: 'indigo' },
  { id: 'TR-03', name: '🚚 이동중 3 (정밀➔외주/ED)', desc: 'C2동 MCT ➔ 2동 에칭실 또는 외주출고', type: 'transit', from: '정밀가공', to: 'ED', color: 'amber' },
  { id: '외주-협력사', name: '외주 협력사 (에스와이/온테크)', desc: '정밀 가공 및 단폴리싱 장기 외주 체류', type: 'outsource', color: 'purple' },
  { id: '2동-EP', name: '04 ED 표면에칭 (2동)', desc: '저저항 표면 산화피막 에칭 반응조', type: 'stage', stageName: 'ED', color: 'violet' },
  { id: 'TR-04', name: '🚚 이동중 4 (ED➔EP)', desc: '2동 에칭 ➔ 1동 단폴리싱 대차 이송', type: 'transit', from: 'ED', to: 'EP', color: 'amber' },
  { id: '1동-단폴리싱', name: '05 EP 단폴리싱 (1동)', desc: '단 Polishing M/C 단차 경면연마', type: 'stage', stageName: 'EP', color: 'amber' },
  { id: 'TR-05', name: '🚚 이동중 5 (EP➔CMP)', desc: '1동 단폴리싱 ➔ 2동 CMP실 대차 이송', type: 'transit', from: 'EP', to: 'CMP', color: 'amber' },
  { id: '2동-CP', name: '06 CMP 초평탄화 (2동)', desc: 'CMP 4HEAD 화학기계 초평탄화', type: 'stage', stageName: 'CMP', color: 'orange' },
  { id: 'TR-06', name: '🚚 이동중 6 (CMP➔세정)', desc: 'CMP 연마 ➔ 초순수 세정조 대차 이송', type: 'transit', from: 'CMP', to: '세정', color: 'amber' },
  { id: '2동-세정', name: '07 초음파세정 (2동)', desc: '초순수 5단 초음파 정밀세정', type: 'stage', stageName: '세정', color: 'cyan' },
  { id: 'TR-07', name: '🚚 이동중 7 (세정➔포장)', desc: '세정 완료 ➔ 3D CMM 검사/포장대 이송', type: 'transit', from: '세정', to: '포장', color: 'amber' },
  { id: '완제품창고', name: '08 포장 / 완제품출하 (2동)', desc: '3D CMM 전수검사 및 진공포장 출하', type: 'stage', stageName: '포장', color: 'teal' }
];

export const OctoberTimelineSimulator: React.FC<OctoberTimelineSimulatorProps> = ({
  orders,
  onSelectOrder
}) => {
  // Current active day: 1 to 31 (2026-10-01 to 2026-10-31)
  const [currentDay, setCurrentDay] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per day
  const [tableFilter, setTableFilter] = useState<'all' | 'alert' | 'transit' | 'outsourced'>('all');
  const timerRef = useRef<number | null>(null);

  const formattedDate = useMemo(() => {
    return `2026-10-${currentDay.toString().padStart(2, '0')}`;
  }, [currentDay]);

  // Autoplay effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= 31) {
            setIsPlaying(false);
            return 31;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  // Calculate status of each work order on `formattedDate`
  const dailyOrdersStatus = useMemo(() => {
    return orders.map((order) => {
      const dayState = order.dailyTimeline?.[formattedDate];
      if (dayState) {
        return {
          order,
          state: dayState
        };
      }

      // Fallback calculation if not precomputed
      const pastEvents = (order.historyLogs || []).filter(e => e.date <= formattedDate);
      if (pastEvents.length === 0) {
        const fallbackPreState: DailySimulationState = {
          date: formattedDate,
          stage: '입고전',
          workshop: '자재창고',
          statusText: '원소재 블랭킹 대기',
          isOutsourced: false,
          isInTransit: false,
          transitRoute: null,
          transitSessionId: null,
          stageDwellDaysOnDate: 0,
          isLongRetentionOnDate: false
        };
        return {
          order,
          state: fallbackPreState
        };
      }

      const lastEv = pastEvents[pastEvents.length - 1];
      const isTransit = lastEv.actionType === '이동출고' || lastEv.workshop === '이동중';
      const fallbackActiveState: DailySimulationState = {
        date: formattedDate,
        stage: (isTransit ? '이동중' : (order.steps[order.currentStageIndex]?.stage || '1차가공')) as any,
        workshop: isTransit ? '공정간 이동중' : (lastEv.workshop || '공정라인'),
        statusText: lastEv.statusText || (isTransit ? '대차 물류 이동중' : '공정 진행중'),
        isOutsourced: Boolean(lastEv.subcontractor),
        isInTransit: isTransit,
        transitRoute: isTransit ? `${lastEv.workshopFrom || '이전공정'} ➔ ${lastEv.workshop || '다음공정'}` : null,
        transitSessionId: null,
        activeEquipment: lastEv.equipmentName,
        stageDwellDaysOnDate: order.maxStageDwellDays || 0,
        isLongRetentionOnDate: (order.maxStageDwellDays || 0) >= 10
      };
      return {
        order,
        state: fallbackActiveState
      };
    });
  }, [orders, formattedDate]);

  // Aggregate stats on current day
  const daySummary = useMemo(() => {
    let inShop = 0;
    let inTransit = 0;
    let outsourced = 0;
    let completed = 0;
    let pending = 0;
    let longRetentionOnDateCount = 0;

    dailyOrdersStatus.forEach(({ order, state }) => {
      if (state.isLongRetentionOnDate || order.hasLongRetentionAlert) {
        longRetentionOnDateCount++;
      }

      if (state.stage === '완료' || state.workshop.includes('완제품')) {
        completed++;
      } else if (state.isOutsourced || state.workshop.includes('외주')) {
        outsourced++;
      } else if (state.isInTransit || state.stage === '이동중' || state.workshop.includes('이동중')) {
        inTransit++;
      } else if (state.stage === '입고전') {
        pending++;
      } else {
        inShop++;
      }
    });

    return {
      inShop,
      inTransit,
      outsourced,
      completed,
      pending,
      longRetentionOnDateCount,
      total: orders.length
    };
  }, [dailyOrdersStatus, orders.length]);

  // Group work orders by station (including 7 specific transit sessions)
  const stationDistribution = useMemo(() => {
    const map: Record<string, typeof dailyOrdersStatus> = {};
    SIMULATION_STATIONS.forEach(s => {
      map[s.id] = [];
    });
    map['기타/대기'] = [];

    dailyOrdersStatus.forEach(item => {
      const wk = item.state.workshop;
      const stage = item.state.stage;
      const isTransit = item.state.isInTransit || stage === '이동중' || wk.includes('이동');
      const route = item.state.transitRoute || '';
      const sId = item.state.transitSessionId || '';

      if (isTransit) {
        // Distribute to specific transit session (TR-01 ~ TR-07)
        if (sId.includes('01') || route.includes('5동')) {
          map['TR-01'].push(item);
        } else if (sId.includes('02') || route.includes('1차') || (route.includes('C2') && route.includes('MCT'))) {
          map['TR-02'].push(item);
        } else if (sId.includes('03') || route.includes('정밀') || route.includes('외주')) {
          map['TR-03'].push(item);
        } else if (sId.includes('04') || route.includes('에칭') || (route.includes('2동-EP') && route.includes('단폴리싱'))) {
          map['TR-04'].push(item);
        } else if (sId.includes('05') || route.includes('단폴리싱') || (route.includes('1동') && route.includes('CP'))) {
          map['TR-05'].push(item);
        } else if (sId.includes('06') || route.includes('CP') || route.includes('CMP') || route.includes('세정')) {
          map['TR-06'].push(item);
        } else if (sId.includes('07') || route.includes('세정') || route.includes('포장')) {
          map['TR-07'].push(item);
        } else {
          map['TR-02'].push(item);
        }
      } else if (item.state.isOutsourced || wk.includes('외주')) {
        map['외주-협력사'].push(item);
      } else if (wk.includes('완제품') || stage === '완료') {
        map['완제품창고'].push(item);
      } else if (wk.includes('5동') || stage === '소재가공') {
        map['5동-소재공정'].push(item);
      } else if (wk.includes('1차가공') || stage === '1차가공') {
        map['C2 1차가공 S 2'].push(item);
      } else if (wk.includes('CNC') || wk.includes('MCT') || wk.includes('Dril') || stage === '정밀가공') {
        map['C2 CNC-S 3 MCT'].push(item);
      } else if (wk.includes('단폴리싱') || wk.includes('1동') || stage === 'EP') {
        map['1동-단폴리싱'].push(item);
      } else if ((wk.includes('EP') && !wk.includes('단폴리싱')) || stage === 'ED') {
        map['2동-EP'].push(item);
      } else if (wk.includes('CP') || stage === 'CMP') {
        map['2동-CP'].push(item);
      } else if (wk.includes('세정') && !wk.includes('완제품')) {
        map['2동-세정'].push(item);
      } else {
        map['기타/대기'].push(item);
      }
    });

    return map;
  }, [dailyOrdersStatus]);

  const handleStepDay = (delta: number) => {
    setCurrentDay(prev => Math.min(31, Math.max(1, prev + delta)));
  };

  return (
    <div className="space-y-6">
      {/* Control & Date Playback Header */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  10월 공정 흐름 일자별 시뮬레이터
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    2026.10.01 ~ 10.31 (31일간 전체 25개 지시서)
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  타임라인 재생을 통해 10월 한 달 동안 25개 지시서가 5동 소재, C2동 가공, 외주처, 1동, 2동을 거쳐 완제품으로 이동하는 흐름을 시뮬레이션합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Current Date Display */}
          <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-3 rounded-xl border border-indigo-500/30 shadow-inner">
            <Calendar className="h-6 w-6 text-indigo-400" />
            <div>
              <div className="text-[11px] text-indigo-300 uppercase font-semibold tracking-wider">시뮬레이션 일자</div>
              <div className="text-2xl font-black text-white tracking-wide font-mono tabular-nums">
                {formattedDate}
              </div>
            </div>
            <div className="ml-2 pl-3 border-l border-slate-800 text-right">
              <div className="text-[11px] text-slate-400">10월 경과율</div>
              <div className="text-sm font-bold text-amber-400 tabular-nums">
                {Math.round((currentDay / 31) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Playback Controls & Slider */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Play/Pause & Step Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-md cursor-pointer ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
                {isPlaying ? '일시정지' : '시뮬레이션 재생'}
              </button>

              <button
                onClick={() => handleStepDay(-1)}
                disabled={currentDay <= 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
                title="전일 (-1일)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleStepDay(1)}
                disabled={currentDay >= 31}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
                title="익일 (+1일)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentDay(1);
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="처음으로 리셋 (10월 1일)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Speed Buttons */}
              <div className="ml-3 flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
                <span className="text-[11px] text-slate-400 px-2">속도:</span>
                {[
                  { label: '1x', ms: 1200 },
                  { label: '2x', ms: 600 },
                  { label: '4x', ms: 300 }
                ].map(spd => (
                  <button
                    key={spd.label}
                    onClick={() => setPlaybackSpeed(spd.ms)}
                    className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer ${
                      playbackSpeed === spd.ms 
                        ? 'bg-indigo-600 text-white font-bold' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Jump to Landmarks */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 mr-1">주요 시점:</span>
              {[
                { label: '10/01 초도', day: 1 },
                { label: '10/10 가공피크', day: 10 },
                { label: '10/20 외주입고', day: 20 },
                { label: '10/31 최종출하', day: 31 }
              ].map(mark => (
                <button
                  key={mark.day}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentDay(mark.day);
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                    currentDay === mark.day
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  {mark.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">10월 1일 (Day 1)</span>
              <span className="font-bold text-indigo-400 font-mono">Day {currentDay} / 31일</span>
              <span className="font-mono">10월 31일 (Day 31)</span>
            </div>
            <input
              type="range"
              min="1"
              max="31"
              value={currentDay}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentDay(parseInt(e.target.value, 10));
              }}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 10-Day Retention Alarm Banner if any order on this date exceeds 10 days */}
      {daySummary.longRetentionOnDateCount > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0 animate-pulse">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div>
              <div className="text-sm font-bold text-rose-200 flex items-center gap-2">
                🚨 10일 이상 장기 체류 작업지시서 경고 발령
                <span className="px-2 py-0.5 rounded text-xs bg-rose-500/30 text-rose-300 font-mono font-bold">
                  {daySummary.longRetentionOnDateCount}건 감지
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {formattedDate} 기준 단일 공정 체류기간(최초 입고일~최종 출고일)이 10일을 초과한 지시서입니다. (외주 가공처 지연 및 공정간 대차 버퍼 확인 필요)
              </p>
            </div>
          </div>
          <button
            onClick={() => setTableFilter('alert')}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition cursor-pointer shadow-md"
          >
            장기체류 목록 필터링
          </button>
        </div>
      )}

      {/* Daily Metrics 5-Box */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">사내 공정 가동</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">{daySummary.inShop}</span>
            <span className="text-xs text-slate-400">건 ({Math.round((daySummary.inShop / daySummary.total) * 100)}%)</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-400">5동, C2동, 1동, 2동 가공</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">외주 협력사 체류</span>
            <Truck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-400 tabular-nums">{daySummary.outsourced}</span>
            <span className="text-xs text-slate-400">건</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-400">에스와이텍 / 온테크 가공</div>
        </div>

        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium">🚚 공정간 이동중 (대차)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 tabular-nums">{daySummary.inTransit}</span>
            <span className="text-xs text-slate-400">건</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-400">라인간 대차 운반 및 창고 버퍼</div>
        </div>

        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-300 font-medium">🚨 10일+ 장기체류</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 tabular-nums">{daySummary.longRetentionOnDateCount}</span>
            <span className="text-xs text-slate-400">건 경고</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-400">최초입고~최종출고 10일 초과</div>
        </div>

        <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-teal-300 font-medium">누적 완제품 출하</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{daySummary.completed}</span>
            <span className="text-xs text-slate-400">건 ({Math.round((daySummary.completed / daySummary.total) * 100)}%)</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400">전 공정 완료 및 포장 출하</div>
        </div>
      </div>

      {/* Workshop Distribution Grid (Visual Map) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              {formattedDate} 현장 공정 스테이션별 실시간 배치 현황 (공정간 이동중 포함)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              5동 ➔ C2동 ➔ 외주 ➔ 1동 ➔ 2동 사이의 <span className="text-amber-400 font-medium">공정간 대차 이동중</span> 및 <span className="text-rose-400 font-medium">10일 이상 장기체류</span> 지시서가 명시됩니다.
            </p>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> 사내공정</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> 이동중</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-400" /> 외주체류</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> 10일+ 경고</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" /> 출하완료</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SIMULATION_STATIONS.map((station) => {
            const stationedOrders = stationDistribution[station.id] || [];
            const count = stationedOrders.length;
            const isOutsourced = station.type === 'outsource';
            const isCompleted = station.id === '완제품창고';
            const isTransit = station.type === 'transit';

            return (
              <div
                key={station.id}
                className={`rounded-xl border p-3.5 transition shadow-sm ${
                  count > 0 
                    ? isTransit
                      ? 'border-amber-600/90 bg-amber-950/30 ring-1 ring-amber-500/30'
                      : isOutsourced 
                      ? 'border-purple-800/80 bg-purple-950/20' 
                      : isCompleted
                      ? 'border-teal-800/80 bg-teal-950/20'
                      : 'border-slate-700 bg-slate-950/70'
                    : isTransit
                    ? 'border-amber-900/30 bg-slate-950/40 opacity-60'
                    : 'border-slate-800/60 bg-slate-950/30 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isTransit && <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span>{station.name}</span>
                      {count > 0 && (
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          isTransit
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isOutsourced 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                            : isCompleted 
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {count}건
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{station.desc}</p>
                  </div>
                </div>

                {/* List of orders stationed here */}
                <div className="mt-3 space-y-2 min-h-[60px]">
                  {count === 0 ? (
                    <div className="text-[11px] text-slate-600 italic py-2">
                      대기 및 작업중인 지시서 없음
                    </div>
                  ) : (
                    stationedOrders.map(({ order, state }) => {
                      const isAlert = state.isLongRetentionOnDate || order.hasLongRetentionAlert;
                      return (
                        <div
                          key={order.id}
                          onClick={() => onSelectOrder(order)}
                          className={`group p-2 rounded-lg border cursor-pointer transition text-xs ${
                            isAlert 
                              ? 'bg-rose-950/30 hover:bg-rose-900/40 border-rose-800/60 hover:border-rose-700'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-200 group-hover:text-indigo-400 truncate flex items-center gap-1.5">
                              {order.orderNumber}
                              <span className="text-[10px] text-slate-400 font-mono">({order.barcode})</span>
                              {isAlert && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                  🚨 장기체류 {order.maxStageDwellDays}일
                                </span>
                              )}
                            </div>
                            {state.activeEquipment && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-900/40 font-mono">
                                {state.activeEquipment.split(' ')[0]}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="truncate text-slate-300">
                              {state.transitRoute ? (
                                <span className="text-amber-400 font-medium">🚚 {state.transitRoute}</span>
                              ) : (
                                state.statusText
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400 font-mono ml-1">
                              체류 {state.stageDwellDaysOnDate || order.maxStageDwellDays}일
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 25 Work Orders Status List on This Day with Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              {formattedDate} 기준 25개 작업지시서 전체 위치 및 공정 상태표
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              각 공정별 최초 입고일과 최종 출고일을 기준으로 산정된 체류기간(일수) 및 공정간 이동중 경로가 표시됩니다.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTableFilter('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition font-medium ${
                tableFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              전체 (25)
            </button>
            <button
              onClick={() => setTableFilter('alert')}
              className={`px-2.5 py-1 rounded cursor-pointer transition font-medium flex items-center gap-1 ${
                tableFilter === 'alert' ? 'bg-rose-600 text-white font-bold' : 'text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              🚨 10일+ 장기체류 ({daySummary.longRetentionOnDateCount})
            </button>
            <button
              onClick={() => setTableFilter('transit')}
              className={`px-2.5 py-1 rounded cursor-pointer transition font-medium flex items-center gap-1 ${
                tableFilter === 'transit' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              🚚 이동중 ({daySummary.inTransit})
            </button>
            <button
              onClick={() => setTableFilter('outsourced')}
              className={`px-2.5 py-1 rounded cursor-pointer transition font-medium ${
                tableFilter === 'outsourced' ? 'bg-purple-600 text-white font-bold' : 'text-purple-400 hover:bg-purple-950/30'
              }`}
            >
              외주 ({daySummary.outsourced})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">작업의뢰서 (바코드)</th>
                <th className="px-4 py-3">제품정보</th>
                <th className="px-4 py-3">당일 위치 작업장</th>
                <th className="px-4 py-3">당일 공정 상태 & 이동경로</th>
                <th className="px-4 py-3">가동 설비</th>
                <th className="px-4 py-3 text-center">공정 체류기간 & 10일+ 경고</th>
                <th className="px-4 py-3 text-center">구분</th>
                <th className="px-4 py-3 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {dailyOrdersStatus
                .filter(({ order, state }) => {
                  if (tableFilter === 'alert') return state.isLongRetentionOnDate || order.hasLongRetentionAlert;
                  if (tableFilter === 'transit') return state.isInTransit || state.stage === '이동중' || state.workshop.includes('이동');
                  if (tableFilter === 'outsourced') return state.isOutsourced || state.workshop.includes('외주');
                  return true;
                })
                .map(({ order, state }) => {
                  const isOut = state.isOutsourced || state.workshop.includes('외주');
                  const isTrans = state.isInTransit || state.stage === '이동중' || state.workshop.includes('이동');
                  const isDone = state.stage === '완료';
                  const isAlert = state.isLongRetentionOnDate || order.hasLongRetentionAlert;
                  const dwellDays = state.stageDwellDaysOnDate || order.maxStageDwellDays || 0;

                  return (
                    <tr key={order.id} className={`transition-colors ${
                      isAlert ? 'bg-rose-950/15 hover:bg-rose-950/30' : 'hover:bg-slate-800/40'
                    }`}>
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          {order.orderNumber}
                          {isAlert && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" title="10일 이상 장기체류" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">바코드: {order.barcode}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-100 font-medium">{order.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{order.productCode}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${
                          isDone 
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : isOut 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : isTrans
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {state.workshop}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300 max-w-[280px]">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {isTrans ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Truck className="h-3 w-3" /> 공정간 이동중
                            </span>
                          ) : (
                            state.stage
                          )}
                        </div>
                        {state.transitRoute ? (
                          <div className="text-[11px] text-amber-300 font-mono bg-amber-950/40 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            🚚 {state.transitRoute}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 truncate">{state.statusText}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {state.activeEquipment || '-'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            isAlert 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : dwellDays >= 5
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            체류 {dwellDays}일
                          </span>
                          {isAlert && (
                            <span className="text-[10px] text-rose-400 font-semibold animate-pulse">
                              🚨 10일 이상 초과
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            외주체류
                          </span>
                        ) : isTrans ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            이동중
                          </span>
                        ) : isDone ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            완제품
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">사내가공</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition flex items-center gap-1 mx-auto"
                        >
                          상세 <ExternalLink className="h-3 w-3" />
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
  );
};
