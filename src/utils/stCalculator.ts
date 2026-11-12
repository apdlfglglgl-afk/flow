import {
  ProcessStageName,
  PROCESS_STAGES,
  STAGE_CONFIGS,
  ProcessStep,
  STMasterRule,
  EquipmentItem,
  WorkOrder,
  BottleneckAnalysis
} from '../types/mes';
import { getStepDwellDays } from './dwellTime';

/**
 * Calculates planned ST (Standard Time) in minutes for a specific stage
 * based on master rules (Equipment x Item Type x Product Type)
 */
export function calculatePlannedST(
  stage: ProcessStageName,
  itemType: string,
  productType: string,
  quantity: number,
  rules: STMasterRule[],
  equipmentList: EquipmentItem[]
): { stMinutes: number; assignedEquipment: EquipmentItem } {
  // Find matching equipment for this stage
  const matchedEquipment = equipmentList.find(e => e.linkedProcess === stage) || {
    id: `EQ-DEF-${stage}`,
    equipmentType: STAGE_CONFIGS[stage].equipmentCategory,
    equipmentName: `${stage}-설비01`,
    linkedProcess: stage,
    status: 'idle' as const,
    utilizationRate: 70,
    standardCapaPerHour: 10,
    location: 'A구역'
  };

  // Find most specific ST rule: itemType + productType + stage
  const specificRule = rules.find(
    r => r.stage === stage &&
         r.itemType.toLowerCase() === itemType.toLowerCase() &&
         r.productType.toLowerCase() === productType.toLowerCase()
  );

  if (specificRule) {
    const totalMinutes = Math.round(specificRule.setupMinutes + (specificRule.stMinutesPerUnit * quantity));
    return { stMinutes: totalMinutes, assignedEquipment: matchedEquipment };
  }

  // Fallback to itemType or stage default
  const partialRule = rules.find(r => r.stage === stage && r.itemType.toLowerCase() === itemType.toLowerCase());
  if (partialRule) {
    const totalMinutes = Math.round(partialRule.setupMinutes + (partialRule.stMinutesPerUnit * quantity));
    return { stMinutes: totalMinutes, assignedEquipment: matchedEquipment };
  }

  // Standard fallback
  const baseMinutesPerUnit = STAGE_CONFIGS[stage].defaultSTMinutes / 20; // assumed 20 base batch
  const totalMinutes = Math.round(15 + (baseMinutesPerUnit * quantity));
  return { stMinutes: totalMinutes, assignedEquipment: matchedEquipment };
}

/**
 * Generates initial 8-step pipeline for a new work order
 */
export function generateProcessStepsForOrder(
  itemType: string,
  productType: string,
  quantity: number,
  rules: STMasterRule[],
  equipmentList: EquipmentItem[],
  startFirstStepImmediately = false
): ProcessStep[] {
  const now = new Date().toISOString();

  return PROCESS_STAGES.map((stageName, index) => {
    const { stMinutes, assignedEquipment } = calculatePlannedST(
      stageName,
      itemType,
      productType,
      quantity,
      rules,
      equipmentList
    );

    const isFirst = index === 0;
    const status = isFirst
      ? (startFirstStepImmediately ? 'in_progress' : 'ready')
      : 'pending';

    return {
      stage: stageName,
      order: index + 1,
      status,
      plannedSTMinutes: stMinutes,
      actualMinutes: null,
      startedAt: isFirst && startFirstStepImmediately ? now : null,
      completedAt: null,
      assignedEquipmentId: assignedEquipment.id,
      assignedEquipmentName: assignedEquipment.equipmentName,
      operatorId: isFirst && startFirstStepImmediately ? 'OP-101' : null,
      operatorName: isFirst && startFirstStepImmediately ? '김진호 책임' : null,
      notes: null,
      defectCount: 0,
      goodCount: quantity
    };
  });
}

/**
 * Analyzes bottleneck per process stage across all active work orders
 */
export function analyzeBottlenecks(workOrders: WorkOrder[]): BottleneckAnalysis[] {
  return PROCESS_STAGES.map(stage => {
    let totalPlannedST = 0;
    let totalActualTime = 0;
    let completedStepsCount = 0;
    let waitingCount = 0;
    let inProgressCount = 0;
    let delayedCount = 0;

    let totalDwellDays = 0;
    let dwellStepsCount = 0;
    let longRetentionCount = 0;

    for (const order of workOrders) {
      const step = order.steps.find(s => s.stage === stage);
      if (!step) continue;

      const dwellDays = getStepDwellDays(step);
      if (dwellDays !== null) {
        totalDwellDays += dwellDays;
        dwellStepsCount++;
        if (dwellDays >= 10 || step.isLongRetention) {
          longRetentionCount++;
        }
      }

      if (step.status === 'completed' && step.actualMinutes !== null) {
        totalPlannedST += step.plannedSTMinutes;
        totalActualTime += step.actualMinutes;
        completedStepsCount++;
        if (step.actualMinutes > step.plannedSTMinutes * 1.2) {
          delayedCount++;
        }
      } else if (step.status === 'in_progress') {
        inProgressCount++;
        if (order.status === 'delayed') {
          delayedCount++;
        }
      } else if (step.status === 'delayed') {
        inProgressCount++;
        delayedCount++;
      } else if (step.status === 'ready') {
        waitingCount++;
      }
    }

    const plannedAvgST = completedStepsCount > 0 ? Math.round(totalPlannedST / completedStepsCount) : STAGE_CONFIGS[stage].defaultSTMinutes;
    const actualAvgTime = completedStepsCount > 0 ? Math.round(totalActualTime / completedStepsCount) : plannedAvgST;
    const stDeviationRatio = plannedAvgST > 0 ? (actualAvgTime - plannedAvgST) / plannedAvgST : 0;
    const delayRatePercent = completedStepsCount + inProgressCount > 0
      ? Math.round((delayedCount / (completedStepsCount + inProgressCount)) * 100)
      : 0;

    const avgDwellDays = dwellStepsCount > 0 ? Math.round((totalDwellDays / dwellStepsCount) * 10) / 10 : 0;
    const avgSTHours = Math.round((actualAvgTime / 60) * 10) / 10;
    const stVsDwellRatio = avgSTHours > 0 ? Math.round((avgDwellDays * 24) / avgSTHours) : 1;

    // Bottleneck rules:
    // 1. High deviation (> +25% ST)
    // 2. High queue buildup (waitingCount >= 3)
    // 3. High delay rate (> 30%)
    // 4. Long retention over 10 days
    const isCritical = stDeviationRatio > 0.35 || waitingCount >= 4 || delayRatePercent >= 40 || longRetentionCount >= 4;
    const isWarning = stDeviationRatio > 0.15 || waitingCount >= 2 || delayRatePercent >= 20 || longRetentionCount >= 1;

    let recommendation = '공정이 계획된 ST 내에서 안정적으로 운영되고 있습니다.';
    if (longRetentionCount > 0) {
      recommendation = `🚨 10일 초과 장기 체류 건수 ${longRetentionCount}건 발생! (평균 체류 ${avgDwellDays}일 vs 순수 가공 ${avgSTHours}시간, 체류 배율 ${stVsDwellRatio}배) 즉시 원인 분석 및 작업 우선순위 조정이 필요합니다.`;
    } else if (isCritical) {
      recommendation = `⚠️ ${stage} 공정에 심각한 병목이 감지되었습니다. 실 소요시간이 ST 대비 ${Math.round(stDeviationRatio * 100)}% 초과되었으며 대기 물량을 확인하세요.`;
    } else if (isWarning) {
      recommendation = `주의: ${stage} 공정에 대기 물량이 누적되고 있습니다. 작업자 추가 배치 및 치구 사전 셋업 점검을 권장합니다.`;
    }

    return {
      stage,
      plannedAvgST,
      actualAvgTime,
      stDeviationRatio,
      activeWaitingCount: waitingCount,
      inProgressCount,
      delayRatePercent,
      isBottleneck: isWarning || isCritical,
      severity: isCritical ? 'critical' : isWarning ? 'warning' : 'normal',
      recommendation,
      avgDwellDays,
      avgSTHours,
      stVsDwellRatio,
      longRetentionCount
    };
  });
}
