import { ProcessStageName, PROCESS_STAGES, STMasterRule, EquipmentItem } from '../types/mes';

export interface ParsedMasterRow {
  equipmentType: string;
  equipmentName?: string;
  itemType: string;
  productType: string;
  stage: ProcessStageName;
  stMinutesPerUnit: number;
  setupMinutes?: number;
  standardCapaPerHour?: number;
  isValid: boolean;
  error?: string;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedMasterRow[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
}

/**
 * Parses TSV (Excel clipboard) or CSV text into ST Master & Equipment rules
 */
export function parseClipboardMasterData(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      rows: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      errors: ['붙여넣을 텍스트 데이터가 비어 있습니다.']
    };
  }

  const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return {
      success: false,
      rows: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      errors: ['유효한 데이터 행이 없습니다.']
    };
  }

  // Determine delimiter: Tab or Comma
  const firstLine = lines[0];
  const isTab = firstLine.includes('\t');
  const delimiter = isTab ? '\t' : ',';

  // Check if first row is header
  let startIndex = 0;
  const headerCandidates = ['설비종류', '설비명', '품목종류', '제품종류', '공정', '공정명', '연동공정', 'st', 'st(분)', '표준시간'];
  const firstCols = firstLine.split(delimiter).map(c => c.trim().toLowerCase());
  const hasHeader = firstCols.some(c => headerCandidates.some(hc => c.includes(hc)));

  if (hasHeader) {
    startIndex = 1;
  }

  const rows: ParsedMasterRow[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 5) {
      rows.push({
        equipmentType: cols[0] || '미지정',
        itemType: cols[1] || '미지정',
        productType: cols[2] || '미지정',
        stage: '소재가공',
        stMinutesPerUnit: 30,
        isValid: false,
        error: `행 ${i + 1}: 열 수가 부족합니다 (최소 5개 열: 설비종류, 설비명, 품목종류, 제품종류, 공정명, ST(분))`
      });
      continue;
    }

    // Standard column arrangement:
    // 0: 설비종류
    // 1: 설비명 (optional/default to type-01)
    // 2: 품목종류
    // 3: 제품종류
    // 4: 공정명 (연동공정)
    // 5: ST(분)
    // 6: 셋업(분) (optional)
    // 7: 시간당CAPA (optional)
    let equipmentType = cols[0] || '기본설비';
    let equipmentName = cols[1] || `${cols[0]}-01`;
    let itemType = cols[2] || '일반부품';
    let productType = cols[3] || '표준재질';
    let rawStage = cols[4] || '';
    let rawST = cols[5] || '30';
    let rawSetup = cols[6] || '10';
    let rawCapa = cols[7] || '10';

    // In case the user pasted a 5-column format: [설비종류, 품목종류, 제품종류, 공정명, ST(분)]
    if (cols.length === 5) {
      equipmentType = cols[0];
      equipmentName = `${cols[0]}-01`;
      itemType = cols[1];
      productType = cols[2];
      rawStage = cols[3];
      rawST = cols[4];
      rawSetup = '10';
      rawCapa = '12';
    }

    // Normalize stage name
    const matchedStage = PROCESS_STAGES.find(s => 
      s.toLowerCase() === rawStage.toLowerCase() ||
      rawStage.toLowerCase().includes(s.toLowerCase())
    );

    const stNumber = parseFloat(rawST.replace(/[^0-9.]/g, ''));
    const setupNumber = parseFloat(rawSetup.replace(/[^0-9.]/g, '')) || 10;
    const capaNumber = parseFloat(rawCapa.replace(/[^0-9.]/g, '')) || 12;

    if (!matchedStage) {
      rows.push({
        equipmentType,
        equipmentName,
        itemType,
        productType,
        stage: '소재가공',
        stMinutesPerUnit: isNaN(stNumber) ? 30 : stNumber,
        isValid: false,
        error: `행 ${i + 1}: 알 수 없는 공정명 '${rawStage}'. (허용: ${PROCESS_STAGES.join(', ')})`
      });
      continue;
    }

    if (isNaN(stNumber) || stNumber <= 0) {
      rows.push({
        equipmentType,
        equipmentName,
        itemType,
        productType,
        stage: matchedStage,
        stMinutesPerUnit: 30,
        isValid: false,
        error: `행 ${i + 1}: ST(표준시간)이 올바른 양의 숫자가 아닙니다 ('${rawST}')`
      });
      continue;
    }

    rows.push({
      equipmentType,
      equipmentName,
      itemType,
      productType,
      stage: matchedStage,
      stMinutesPerUnit: stNumber,
      setupMinutes: setupNumber,
      standardCapaPerHour: capaNumber,
      isValid: true
    });
  }

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  return {
    success: validCount > 0,
    rows,
    totalParsed: rows.length,
    validCount,
    invalidCount,
    errors
  };
}

/**
 * Returns sample TSV text matching Excel standard copy/paste format
 */
export function getSampleClipboardData(): string {
  return [
    '설비종류\t설비명\t품목종류\t제품종류\t연동공정\tST(분)\t셋업(분)\t시간당CAPA',
    '고속절단기\tSAW-01\t반도체 부품\t쿼츠\t소재가공\t25\t10\t15',
    'NC밀링센터\tMIL-02\t반도체 부품\t쿼츠\t1차가공\t50\t15\t8',
    '5축 고속머시닝\tCNC-5AX-01\t반도체 부품\t쿼츠\t정밀가공\t80\t20\t5',
    '전착도장 자동조\tED-LINE-01\t반도체 부품\t쿼츠\tED\t40\t15\t10',
    '전해연마 반응기\tEP-BATH-02\t반도체 부품\t쿼츠\tEP\t35\t10\t12',
    'CMP 초평탄연마기\tCMP-POL-01\t반도체 부품\t쿼츠\tCMP\t65\t20\t6',
    '초음파 6단세정기\tCLN-US-03\t반도체 부품\t쿼츠\t세정\t25\t5\t20',
    '클린룸 진공포장기\tPKG-VAC-01\t반도체 부품\t쿼츠\t포장\t15\t5\t30',
    '초정밀 CNC선반\tLATHE-03\t광학 부품\tSiC\t정밀가공\t110\t30\t4',
    'CMP 초평탄연마기\tCMP-POL-02\t광학 부품\tSiC\tCMP\t85\t25\t4',
    '초음파 6단세정기\tCLN-US-02\t광학 부품\tSiC\t세정\t30\t10\t18'
  ].join('\n');
}

/**
 * Converts parsed rows into system STMasterRule and EquipmentItem objects
 */
export function convertParsedRowsToMasters(
  rows: ParsedMasterRow[],
  currentRules: STMasterRule[],
  currentEquipment: EquipmentItem[]
): { updatedRules: STMasterRule[]; updatedEquipment: EquipmentItem[] } {
  const updatedRules = [...currentRules];
  const updatedEquipment = [...currentEquipment];
  const now = new Date().toISOString();

  for (const row of rows) {
    if (!row.isValid) continue;

    // 1. Update or Add ST Rule
    const existingRuleIndex = updatedRules.findIndex(
      r => r.equipmentType === row.equipmentType &&
           r.itemType === row.itemType &&
           r.productType === row.productType &&
           r.stage === row.stage
    );

    if (existingRuleIndex >= 0) {
      updatedRules[existingRuleIndex] = {
        ...updatedRules[existingRuleIndex],
        stMinutesPerUnit: row.stMinutesPerUnit,
        setupMinutes: row.setupMinutes ?? updatedRules[existingRuleIndex].setupMinutes,
        updatedAt: now
      };
    } else {
      updatedRules.push({
        id: `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        equipmentType: row.equipmentType,
        itemType: row.itemType,
        productType: row.productType,
        stage: row.stage,
        stMinutesPerUnit: row.stMinutesPerUnit,
        setupMinutes: row.setupMinutes ?? 10,
        updatedAt: now
      });
    }

    // 2. Update or Add Equipment Item
    if (row.equipmentName) {
      const existingEquipIndex = updatedEquipment.findIndex(e => e.equipmentName === row.equipmentName);
      if (existingEquipIndex >= 0) {
        updatedEquipment[existingEquipIndex] = {
          ...updatedEquipment[existingEquipIndex],
          equipmentType: row.equipmentType,
          linkedProcess: row.stage,
          standardCapaPerHour: row.standardCapaPerHour ?? updatedEquipment[existingEquipIndex].standardCapaPerHour
        };
      } else {
        updatedEquipment.push({
          id: `EQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          equipmentType: row.equipmentType,
          equipmentName: row.equipmentName,
          linkedProcess: row.stage,
          status: 'idle',
          utilizationRate: 65,
          standardCapaPerHour: row.standardCapaPerHour ?? 10,
          location: '제1공장 메인라인'
        });
      }
    }
  }

  return { updatedRules, updatedEquipment };
}
