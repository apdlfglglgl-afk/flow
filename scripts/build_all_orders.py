import csv
from datetime import datetime, date, timedelta
import re
import json

def parse_time(t_str):
    if not t_str:
        return None
    m = re.match(r'(\d{4}-\d{2}-\d{2})\s+(오전|오후)\s+(\d+):(\d+):(\d+)', t_str.strip())
    if m:
        d_str, ampm, h, mn, s = m.groups()
        hour = int(h)
        if ampm == '오후' and hour < 12:
            hour += 12
        elif ampm == '오전' and hour == 12:
            hour = 0
        return datetime.strptime(f'{d_str} {hour:02d}:{mn}:{s}', '%Y-%m-%d %H:%M:%S')
    return None

with open('public/assets/aistudio/___d1ddd82c', 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    rows = [r for r in reader if r.get('작업의뢰서바코드') and r.get('작업의뢰서바코드') != '작업의뢰서바코드']

# Group by barcode
barcodes = {}
for r in rows:
    bc = r.get('작업의뢰서바코드').strip()
    if bc not in barcodes:
        barcodes[bc] = []
    barcodes[bc].append(r)

STAGE_MAPPING = {
    'CORE': '소재가공',
    '면가공': '1차가공',
    '외경가공': '1차가공',
    'HOLE': '정밀가공',
    '내경/내단가공': '정밀가공',
    'TAP': '정밀가공',
    '키홀': '정밀가공',
    '에칭': 'ED',
    '단폴리싱': 'EP',
    '폴리싱': 'CMP',
    '세정': '세정',
    '포장': '포장',
}

WORKORDERS = []

# List of all 31 days in October 2026
october_dates = [f'2026-10-{d:02d}' for d in range(1, 32)]

# Pre-defined LT exclusions for high-LT orders
EXCLUSION_CONFIGS = {
    '100227417': {
        'isExcluded': True,
        'reason': '외주사(주식회사 에스와이텍) 정밀 MCT 전기로 긴급 오버홀 및 추석 연휴 물류 지연',
        'days': 25,
        'date': '2026-09-25T10:00:00Z',
        'history': [
            {
                'id': 'EX-01',
                'action': 'exclude',
                'date': '2026-09-25T10:00:00Z',
                'reason': '외주사(주식회사 에스와이텍) 정밀 MCT 전기로 긴급 오버홀 및 추석 연휴 물류 지연',
                'excludedDays': 25,
                'actor': '박성민 생산총괄팀장',
                'notes': '협력사 공식 공문 접수 (생산본부 승인 완료, KPI 인정 LT 산출 시 25일 차감)'
            }
        ]
    },
    '100230021': {
        'isExcluded': True,
        'reason': '고객사 초도품 3D CMM 단차 스펙 변경 검토로 인한 전 공정 보류(Customer Hold)',
        'days': 30,
        'date': '2026-09-15T14:30:00Z',
        'history': [
            {
                'id': 'EX-02',
                'action': 'exclude',
                'date': '2026-09-15T14:30:00Z',
                'reason': '고객사 초도품 3D CMM 단차 스펙 변경 검토로 인한 전 공정 보류(Customer Hold)',
                'excludedDays': 30,
                'actor': '박성민 생산총괄팀장',
                'notes': 'Lam Research 코리아 공식 ECN 승인 대기로 30일 공정 대기 발생. 납기 KPI 예외 승인.'
            }
        ]
    },
    '100231549': {
        'isExcluded': True,
        'reason': '원소재 잉곳 저항 불균일 이슈로 Lam사 승인 재검증 대기',
        'days': 28,
        'date': '2026-09-18T11:00:00Z',
        'history': [
            {
                'id': 'EX-03',
                'action': 'exclude',
                'date': '2026-09-18T11:00:00Z',
                'reason': '원소재 잉곳 저항 불균일 이슈로 Lam사 승인 재검증 대기',
                'excludedDays': 28,
                'actor': '박성민 생산총괄팀장',
                'notes': '소재 로트 교체 및 샘플 재저항 측정 후 10/19 외주 재출고 승인'
            }
        ]
    }
}

for bc, r_list in barcodes.items():
    pname = r_list[0].get('제품명', '').strip()
    pcode = r_list[0].get('제품코드', '').strip()
    
    # Calculate ST minutes
    st_minutes = 0
    first_dt = None
    last_dt = None
    first_date_str = None
    last_date_str = None
    outs = set()
    out_out_date = None
    out_in_date = None
    out_processes = set()
    
    # Sort events by date and time
    parsed_events = []
    movement_count = 0
    for r in r_list:
        st = parse_time(r.get('시작시간'))
        et = parse_time(r.get('종료시간'))
        d_str = r.get('일자', '').strip()
        cat = r.get('구분', '').strip()
        act = r.get('작업구분', '').strip()
        p_name = r.get('공정명', '').strip()
        vendor = r.get('외주처', '').strip().rstrip('.')
        
        if cat == '작업장이동':
            movement_count += 1
            
        if st:
            if not first_dt or st < first_dt:
                first_dt = st
        if et:
            if not last_dt or et > last_dt:
                last_dt = et
                
        if d_str:
            if not first_date_str or d_str < first_date_str:
                first_date_str = d_str
            if not last_date_str or d_str > last_date_str:
                last_date_str = d_str
                
        if cat == '공정생산' and st and et:
            diff = (et - st).total_seconds() / 60
            if 0 < diff < 10000:
                st_minutes += diff
                
        if vendor:
            outs.add(vendor)
            if act == '외주출고' and not out_out_date:
                out_out_date = d_str
            elif act == '외주입고':
                out_in_date = d_str
            if p_name:
                out_processes.add(p_name)
    
    # Total Lead Time
    if first_dt and last_dt:
        total_lt_hrs = (last_dt - first_dt).total_seconds() / 3600
        lt_days = total_lt_hrs / 24
    else:
        d0 = datetime.strptime(first_date_str, '%Y-%m-%d')
        d1 = datetime.strptime(last_date_str, '%Y-%m-%d')
        lt_days = (d1 - d0).days + 1
        total_lt_hrs = lt_days * 24

    transfer_mins = round(movement_count * 35)
    total_lt_mins = total_lt_hrs * 60
    queue_mins = max(0, round(total_lt_mins - st_minutes - transfer_mins))
    
    out_vendor = list(outs)[0] if outs else None
    out_retention = 0
    if out_out_date and out_in_date:
        d_out = datetime.strptime(out_out_date, '%Y-%m-%d')
        d_in = datetime.strptime(out_in_date, '%Y-%m-%d')
        out_retention = max(0, (d_in - d_out).days)
    elif out_out_date and not out_in_date:
        d_out = datetime.strptime(out_out_date, '%Y-%m-%d')
        d_ref = datetime(2026, 10, 31)
        out_retention = max(0, (d_ref - d_out).days)

    # Subcontractor status
    if out_vendor:
        if out_in_date:
            sub_status = '입고완료'
        elif out_out_date:
            sub_status = '외주가공중'
        else:
            sub_status = '대기'
    else:
        sub_status = '해당없음'

    # Exclusion config
    ex_cfg = EXCLUSION_CONFIGS.get(bc, {})
    is_excluded = ex_cfg.get('isExcluded', False)
    ex_reason = ex_cfg.get('reason', '')
    ex_days = ex_cfg.get('days', 0)
    ex_date = ex_cfg.get('date', '')
    ex_hist = ex_cfg.get('history', [])
    adj_lt_days = max(1.0, round(lt_days - ex_days, 1)) if is_excluded else round(lt_days, 1)

    # ST minutes allocation per stage
    st_alloc = {
        '소재가공': 25,
        '1차가공': round(st_minutes * 0.15),
        '정밀가공': round(st_minutes * 0.45),
        'ED': 20,
        'EP': round(st_minutes * 0.25) if '온테크' in str(out_vendor) or out_processes else 800,
        'CMP': 30,
        '세정': 15,
        '포장': 15
    }
    # Ensure exact sum of ST minutes
    diff_st = round(st_minutes) - sum(st_alloc.values())
    st_alloc['정밀가공'] += diff_st
    total_st_mins = sum(st_alloc.values())
    st_hrs = round(total_st_mins / 60.0, 1)

    total_lt_hrs = round(total_lt_hrs, 1)
    lt_days = round(total_lt_hrs / 24.0, 1)

    # Transfer hours & Queue hours (exact reconciliation to total_lt_hrs)
    transfer_hrs = round(transfer_mins / 60.0, 1)
    queue_hrs = round(total_lt_hrs - st_hrs - transfer_hrs, 1)
    if queue_hrs < 12.0:
        queue_hrs = 12.0
        total_lt_hrs = round(st_hrs + transfer_hrs + queue_hrs, 1)
        lt_days = round(total_lt_hrs / 24.0, 1)

    # 7 transit hours distribution
    if out_vendor:
        t_weights = [0.10, 0.08, 0.40, 0.14, 0.12, 0.08, 0.08]
    else:
        t_weights = [0.16, 0.12, 0.20, 0.16, 0.16, 0.10, 0.10]
    
    transit_hrs_list = [round(transfer_hrs * w, 1) for w in t_weights]
    transit_hrs_list[-1] = round(transfer_hrs - sum(transit_hrs_list[:-1]), 1)
    transit_days_list = [round(h / 24.0, 1) for h in transit_hrs_list]

    # Calculate exact stage dates (firstInDate, lastOutDate) from real factory events
    STAGE_KEYWORDS = [
        ('소재가공', ['5동', 'CORE', '소재']),
        ('1차가공', ['1차가공', '면가공', '외경가공', '횡로타리']),
        ('정밀가공', ['CNC', 'MCT', 'Dril', 'HOLE', '내경', '키홀', 'TAP', '에스와이텍']),
        ('ED', ['에칭', '면 에칭', '2동-EP']),
        ('EP', ['단폴리싱', '온테크놀로지', '1동']),
        ('CMP', ['CMP', '폴리싱', '2동-CP']),
        ('세정', ['세정', '2동-세정']),
        ('포장', ['포장', '검사', '완제품창고', '완제품'])
    ]

    raw_spans = []
    matched_dates = []
    for stg, kws in STAGE_KEYWORDS:
        matched = []
        for r in r_list:
            text = f"{r.get('공정명','')} {r.get('작업장','')} {r.get('작업장(From)','')} {r.get('외주처','')}"
            if any(k in text for k in kws):
                matched.append(r)
        if matched:
            d_in = min(r.get('일자') for r in matched)
            d_out = max(r.get('일자') for r in matched)
            diff_d = (datetime.strptime(d_out, '%Y-%m-%d') - datetime.strptime(d_in, '%Y-%m-%d')).days
            span = diff_d + 0.5 if diff_d > 0 else 0.5
            raw_spans.append(span)
            matched_dates.append((d_in, d_out, True))
        else:
            raw_spans.append(0.5)
            matched_dates.append((first_date_str, last_date_str, False))

    tot_span = sum(raw_spans)
    stage_dwell_hrs = [round(queue_hrs * (s / tot_span), 1) for s in raw_spans]
    stage_dwell_hrs[-1] = round(queue_hrs - sum(stage_dwell_hrs[:-1]), 1)
    stage_dwell_days = [round(h / 24.0, 1) for h in stage_dwell_hrs]

    stage_metrics = {}
    for idx, (stg, _) in enumerate(STAGE_KEYWORDS):
        d_in, d_out, was_matched = matched_dates[idx]
        d_days = stage_dwell_days[idx]
        d_hrs = stage_dwell_hrs[idx]
        is_long = (d_days >= 10.0) or (raw_spans[idx] >= 10.0)
        stage_metrics[stg] = {
            'firstInDate': d_in,
            'lastOutDate': d_out,
            'totalSpanDays': round(raw_spans[idx], 1),
            'dwellDays': d_days,
            'dwellHours': d_hrs,
            'isLongRetention': is_long
        }

    # Calculate Daily Timeline for all 31 days in October 2026
    daily_timeline = {}
    for d_day in october_dates:
        past_events = [r for r in r_list if r.get('일자', '') <= d_day]
        if not past_events:
            daily_timeline[d_day] = {
                'date': d_day,
                'stage': '입고전',
                'workshop': '자재창고',
                'statusText': '원소재 블랭킹 대기',
                'isOutsourced': False,
                'isInTransit': False,
                'transitSessionId': None,
                'transitRoute': None,
                'stageDwellDaysOnDate': 0,
                'isLongRetentionOnDate': False
            }
        else:
            last_ev = past_events[-1]
            act = last_ev.get('작업구분', '').strip()
            cat = last_ev.get('구분', '').strip()
            p_name = last_ev.get('공정명', '').strip()
            wk = last_ev.get('작업장', '').strip()
            ev_date = last_ev.get('일자', '').strip()
            vendor = last_ev.get('외주처', '').strip().rstrip('.')
            eq_name = last_ev.get('장비명', '').strip()

            is_out = False
            is_trans = False
            transit_route = None
            transit_session_id = None
            stage_name = STAGE_MAPPING.get(p_name, '1차가공')
            
            # Check transit between stages
            if act == '이동출고' or wk == '이동중':
                is_trans = True
                stage_name = '이동중'
                wk = '공정간 이동중'
                from_wk = last_ev.get('작업장(From)') or '5동-소재공정'
                # Find destination workshop
                future_events = [r for r in r_list if r.get('일자', '') >= d_day and r.get('작업장') and r.get('작업장') != '이동중']
                to_wk = future_events[0].get('작업장') if future_events else '다음공정'
                transit_route = f"{from_wk} ➔ {to_wk}"
                
                # Identify which session (1 to 7) based on from_wk / to_wk
                if '5동' in from_wk: transit_session_id = 'TR-SESSION-01'
                elif '1차' in from_wk: transit_session_id = 'TR-SESSION-02'
                elif 'CNC' in from_wk or 'MCT' in from_wk: transit_session_id = 'TR-SESSION-03'
                elif 'EP' in from_wk or '에칭' in from_wk: transit_session_id = 'TR-SESSION-04'
                elif '단폴리싱' in from_wk or '1동' in from_wk: transit_session_id = 'TR-SESSION-05'
                elif 'CP' in from_wk or 'CMP' in from_wk: transit_session_id = 'TR-SESSION-06'
                else: transit_session_id = 'TR-SESSION-07'

                status_text = f"공정간 대차 이동중 ({from_wk} ➔ {to_wk})"
            elif out_out_date and out_out_date <= d_day:
                if not out_in_date or d_day < out_in_date:
                    is_out = True
                    stage_name = '외주가공'
                    wk = f'외주-{out_vendor}'
                    d_out = datetime.strptime(out_out_date, '%Y-%m-%d')
                    d_curr = datetime.strptime(d_day, '%Y-%m-%d')
                    out_days = (d_curr - d_out).days + 1
                    status_text = f"{out_vendor} 정밀 가공 진행중 (체류 {out_days}일차)"
                else:
                    if p_name == '포장' and ev_date <= d_day:
                        stage_name = '완료'
                        wk = '완제품창고'
                        status_text = '완제품 검사 및 포장 출하 완료'
                    else:
                        stage_name = STAGE_MAPPING.get(p_name, 'CMP')
                        status_text = f'{wk} 공정 가공 및 검사 대기'
            elif p_name == '포장' and ev_date <= d_day and cat == '공정생산':
                stage_name = '완료'
                wk = '완제품창고'
                status_text = '완제품 100% 출하 완료'
            elif act == '이동입고':
                status_text = f'{wk} 작업장 입고 완료 및 대기'
            else:
                status_text = f'{wk} {p_name} 공정 작업'

            # Calculate dwell days on this date (excess over ST)
            same_stage_events = [r for r in past_events if (r.get('작업장') == wk or r.get('공정명') == p_name or (is_out and r.get('외주처')))]
            if same_stage_events:
                d_entry = min(r.get('일자') for r in same_stage_events)
                dt_entry = datetime.strptime(d_entry, '%Y-%m-%d')
                dt_curr = datetime.strptime(d_day, '%Y-%m-%d')
                dwell_on_date = max(1, (dt_curr - dt_entry).days + 1)
            else:
                dwell_on_date = 1

            is_long_on_date = (dwell_on_date >= 10)
            if is_long_on_date and not is_trans and stage_name != '완료':
                status_text += f" [🚨 10일 이상 장기체류 경고 ({dwell_on_date}일째)]"

            daily_timeline[d_day] = {
                'date': d_day,
                'stage': stage_name,
                'workshop': wk or '공정라인',
                'statusText': status_text,
                'isOutsourced': is_out,
                'isInTransit': is_trans,
                'transitSessionId': transit_session_id,
                'transitRoute': transit_route,
                'activeEquipment': eq_name or None,
                'stageDwellDaysOnDate': dwell_on_date,
                'isLongRetentionOnDate': is_long_on_date
            }

    # Build 8 steps with exact firstInDate and lastOutDate
    stg1 = stage_metrics['소재가공']
    stg2 = stage_metrics['1차가공']
    stg3 = stage_metrics['정밀가공']
    stg4 = stage_metrics['ED']
    stg5 = stage_metrics['EP']
    stg6 = stage_metrics['CMP']
    stg7 = stage_metrics['세정']
    stg8 = stage_metrics['포장']

    steps = [
        {
            'stage': '소재가공',
            'stageCode': 'CORE (A004)',
            'order': 1,
            'status': 'completed',
            'plannedSTMinutes': 25,
            'actualMinutes': st_alloc['소재가공'],
            'firstInDate': stg1['firstInDate'],
            'lastOutDate': stg1['lastOutDate'],
            'startedAt': f"{stg1['firstInDate']}T04:00:00Z",
            'completedAt': f"{stg1['lastOutDate']}T04:15:00Z",
            'assignedEquipmentId': 'EQ-WJ-001',
            'assignedEquipmentCode': 'PR-WJ-001',
            'assignedEquipmentName': '워터젯 (PR-WJ-001)',
            'workshop': '5동-소재공정',
            'operatorId': 'OP-주보성',
            'operatorName': '주보성',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg1['dwellDays'],
            'dwellHours': stg1['dwellHours'],
            'isLongRetention': stg1['isLongRetention'],
            'dwellAlertReason': f"소재가공 체류 {stg1['dwellDays']}일 (최초입고 {stg1['firstInDate']} ~ 최종출고 {stg1['lastOutDate']}, 10일 이상 장기체류 경고)" if stg1['isLongRetention'] else None,
            'notes': f"워터젯 CORE 외경 절단 양호 (최초입고: {stg1['firstInDate']} ~ 최종출고: {stg1['lastOutDate']})"
        },
        {
            'stage': '1차가공',
            'stageCode': '면/외경 (A041, A057)',
            'order': 2,
            'status': 'completed',
            'plannedSTMinutes': 45,
            'actualMinutes': st_alloc['1차가공'],
            'firstInDate': stg2['firstInDate'],
            'lastOutDate': stg2['lastOutDate'],
            'startedAt': f"{stg2['firstInDate']}T10:00:00Z",
            'completedAt': f"{stg2['lastOutDate']}T14:00:00Z",
            'assignedEquipmentId': 'EQ-AG-503',
            'assignedEquipmentCode': 'PR-AG-503',
            'assignedEquipmentName': '횡로타리 #3 (PR-AG-503)',
            'workshop': 'C2 1차가공 S 2',
            'operatorId': 'OP-이현준',
            'operatorName': '이현준',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg2['dwellDays'],
            'dwellHours': stg2['dwellHours'],
            'isLongRetention': stg2['isLongRetention'],
            'dwellAlertReason': f"1차가공 체류 {stg2['dwellDays']}일 (최초입고 {stg2['firstInDate']} ~ 최종출고 {stg2['lastOutDate']}, 10일 이상 장기체류 경고)" if stg2['isLongRetention'] else None,
            'notes': f"횡로타리 1/2차 면가공 및 NC원통 외경연삭 (체류 {stg2['dwellDays']}일)"
        },
        {
            'stage': '정밀가공',
            'stageCode': 'MCT/Drill (A008, A030, A065)',
            'order': 3,
            'status': 'completed',
            'plannedSTMinutes': 180,
            'actualMinutes': st_alloc['정밀가공'],
            'firstInDate': stg3['firstInDate'],
            'lastOutDate': stg3['lastOutDate'],
            'startedAt': f"{stg3['firstInDate']}T15:00:00Z",
            'completedAt': f"{stg3['lastOutDate']}T22:00:00Z",
            'assignedEquipmentId': 'EQ-OK-511',
            'assignedEquipmentCode': 'PR-OK-511',
            'assignedEquipmentName': 'OKUMA MCT#11 (PR-OK-511)',
            'workshop': 'C2 CNC-S 3 MCT',
            'operatorId': 'OP-정진현',
            'operatorName': '정진현',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg3['dwellDays'],
            'dwellHours': stg3['dwellHours'],
            'isLongRetention': stg3['isLongRetention'],
            'dwellAlertReason': f"정밀가공 체류 {stg3['dwellDays']}일 (최초입고 {stg3['firstInDate']} ~ 최종출고 {stg3['lastOutDate']}, 10일 이상 장기체류 경고)" if stg3['isLongRetention'] else None,
            'notes': f"OKUMA 5축 내단경/키홀/드릴 정밀가공 (체류 {stg3['dwellDays']}일)"
        },
        {
            'stage': 'ED',
            'stageCode': '면 에칭 (A040)',
            'order': 4,
            'status': 'completed',
            'plannedSTMinutes': 20,
            'actualMinutes': st_alloc['ED'],
            'firstInDate': stg4['firstInDate'],
            'lastOutDate': stg4['lastOutDate'],
            'startedAt': f"{stg4['firstInDate']}T08:00:00Z",
            'completedAt': f"{stg4['lastOutDate']}T08:20:00Z",
            'assignedEquipmentId': 'EQ-ET-001',
            'assignedEquipmentCode': 'PR-ET-001',
            'assignedEquipmentName': '에칭 표면반응조',
            'workshop': '2동-EP',
            'operatorId': 'OP-박수현',
            'operatorName': '박수현',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg4['dwellDays'],
            'dwellHours': stg4['dwellHours'],
            'isLongRetention': stg4['isLongRetention'],
            'dwellAlertReason': f"ED 공정 체류 {stg4['dwellDays']}일 (최초입고 {stg4['firstInDate']} ~ 최종출고 {stg4['lastOutDate']}, 10일 이상 장기체류 경고)" if stg4['isLongRetention'] else None,
            'notes': f"저저항 표면 산화피막 에칭 (체류 {stg4['dwellDays']}일)"
        },
        {
            'stage': 'EP',
            'stageCode': '단폴리싱 (A073)',
            'order': 5,
            'status': 'completed',
            'plannedSTMinutes': 120,
            'actualMinutes': st_alloc['EP'],
            'firstInDate': stg5['firstInDate'],
            'lastOutDate': stg5['lastOutDate'],
            'startedAt': f"{stg5['firstInDate']}T09:00:00Z",
            'completedAt': f"{stg5['lastOutDate']}T11:30:00Z",
            'assignedEquipmentId': 'EQ-PL-024',
            'assignedEquipmentCode': 'PR-PL-024',
            'assignedEquipmentName': '단 Polishing M/C #11',
            'workshop': '1동-단폴리싱',
            'operatorId': 'OP-조수진',
            'operatorName': '조수진',
            'subcontractor': out_vendor or None,
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg5['dwellDays'],
            'dwellHours': stg5['dwellHours'],
            'isLongRetention': stg5['isLongRetention'],
            'dwellAlertReason': f"단폴리싱 체류 {stg5['dwellDays']}일 (최초입고 {stg5['firstInDate']} ~ 최종출고 {stg5['lastOutDate']}, 10일 이상 장기체류 경고)" if stg5['isLongRetention'] else None,
            'notes': f"단차 표면조도 개선 연마 (" + ('외주: ' + str(out_vendor) if out_vendor else '사내 1동') + f", 체류 {stg5['dwellDays']}일)"
        },
        {
            'stage': 'CMP',
            'stageCode': '초평탄화 (A069)',
            'order': 6,
            'status': 'completed',
            'plannedSTMinutes': 30,
            'actualMinutes': st_alloc['CMP'],
            'firstInDate': stg6['firstInDate'],
            'lastOutDate': stg6['lastOutDate'],
            'startedAt': f"{stg6['firstInDate']}T12:00:00Z",
            'completedAt': f"{stg6['lastOutDate']}T12:25:00Z",
            'assignedEquipmentId': 'EQ-CP-005',
            'assignedEquipmentCode': 'PR-CP-005',
            'assignedEquipmentName': 'CMP 4HEAD #5',
            'workshop': '2동-CP',
            'operatorId': 'OP-김진영',
            'operatorName': '김진영',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg6['dwellDays'],
            'dwellHours': stg6['dwellHours'],
            'isLongRetention': stg6['isLongRetention'],
            'dwellAlertReason': f"CMP 체류 {stg6['dwellDays']}일 (최초입고 {stg6['firstInDate']} ~ 최종출고 {stg6['lastOutDate']}, 10일 이상 장기체류 경고)" if stg6['isLongRetention'] else None,
            'notes': f"CMP 4HEAD 초평탄 화학기계연마 (체류 {stg6['dwellDays']}일)"
        },
        {
            'stage': '세정',
            'stageCode': '초음파세정 (A049)',
            'order': 7,
            'status': 'completed',
            'plannedSTMinutes': 15,
            'actualMinutes': st_alloc['세정'],
            'firstInDate': stg7['firstInDate'],
            'lastOutDate': stg7['lastOutDate'],
            'startedAt': f"{stg7['firstInDate']}T13:00:00Z",
            'completedAt': f"{stg7['lastOutDate']}T13:15:00Z",
            'assignedEquipmentId': 'EQ-CL-001',
            'assignedEquipmentCode': 'PR-CL-001',
            'assignedEquipmentName': 'RING 세정 1조',
            'workshop': '2동-세정',
            'operatorId': 'OP-이영호',
            'operatorName': '이영호',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg7['dwellDays'],
            'dwellHours': stg7['dwellHours'],
            'isLongRetention': stg7['isLongRetention'],
            'dwellAlertReason': f"세정 체류 {stg7['dwellDays']}일 (최초입고 {stg7['firstInDate']} ~ 최종출고 {stg7['lastOutDate']}, 10일 이상 장기체류 경고)" if stg7['isLongRetention'] else None,
            'notes': f"초순수 5단 초음파 세정 (체류 {stg7['dwellDays']}일)"
        },
        {
            'stage': '포장',
            'stageCode': '검사/포장 (A025, A068)',
            'order': 8,
            'status': 'completed',
            'plannedSTMinutes': 15,
            'actualMinutes': st_alloc['포장'],
            'firstInDate': stg8['firstInDate'],
            'lastOutDate': stg8['lastOutDate'],
            'startedAt': f"{stg8['firstInDate']}T14:00:00Z",
            'completedAt': f"{stg8['lastOutDate']}T14:15:00Z",
            'assignedEquipmentId': 'EQ-PK-014',
            'assignedEquipmentCode': 'PR-ZZ-014',
            'assignedEquipmentName': '포장테이블 (PR-ZZ-014)',
            'workshop': '2동-세정/포장',
            'operatorId': 'OP-정서우',
            'operatorName': '정서우',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': stg8['dwellDays'],
            'dwellHours': stg8['dwellHours'],
            'isLongRetention': stg8['isLongRetention'],
            'dwellAlertReason': f"포장 체류 {stg8['dwellDays']}일 (최초입고 {stg8['firstInDate']} ~ 최종출고 {stg8['lastOutDate']}, 10일 이상 장기체류 경고)" if stg8['isLongRetention'] else None,
            'notes': f"3D CMM 전수합격 및 질소 진공포장 완제품 출하 (체류 {stg8['dwellDays']}일)"
        }
    ]

    # Convert event logs
    history_logs = []
    for idx, r in enumerate(r_list):
        history_logs.append({
            'id': f'EV-{bc}-{idx+1:03d}',
            'category': r.get('구분', '').strip() or '공정생산',
            'date': r.get('일자', '').strip(),
            'actionType': r.get('작업구분', '').strip() or '완료',
            'stepSeq': int(r.get('공정순번', 0)) if r.get('공정순번', '').isdigit() else None,
            'processCode': r.get('공정코드', '').strip() or None,
            'processName': r.get('공정명', '').strip() or '공정작업',
            'equipmentCode': r.get('장비코드', '').strip() or None,
            'equipmentName': r.get('장비명', '').strip() or None,
            'startTime': r.get('시작시간', '').strip() or None,
            'endTime': r.get('종료시간', '').strip() or None,
            'workerName': r.get('작업자', '').strip() or '현장작업자',
            'workshop': r.get('작업장', '').strip() or '공정라인',
            'workshopFrom': r.get('작업장(From)', '').strip() or None,
            'subcontractor': r.get('외주처', '').strip().rstrip('.') or None,
            'statusText': r.get('상태', '').strip() or '완료'
        })

    # Compute 7 Inter-Stage Transits between the 8 process steps
    inter_transits = []
    for s_idx in range(len(steps) - 1):
        s_from = steps[s_idx]
        s_to = steps[s_idx + 1]
        
        # Out from current step
        out_d_str = s_from.get('lastOutDate') or s_from.get('completedAt', '')[:10]
        # In to next step
        in_d_str = s_to.get('firstInDate') or s_to.get('startedAt', '')[:10]
        
        from_loc = s_from.get('workshop') or s_from['stage']
        to_loc = s_to.get('workshop') or s_to['stage']
        is_sub = bool(s_from.get('subcontractor')) or bool(s_to.get('subcontractor')) or ('외주' in from_loc) or ('외주' in to_loc)
        sub_name = s_from.get('subcontractor') or s_to.get('subcontractor') or (out_vendor if is_sub else None)

        t_days = transit_days_list[s_idx]
        t_hrs = transit_hrs_list[s_idx]
        is_transit_long = t_days >= 10.0

        # Determine realistic transit start and end dates
        trans_start = out_d_str
        trans_end = in_d_str
        if out_d_str and in_d_str:
            try:
                if datetime.strptime(out_d_str, '%Y-%m-%d') > datetime.strptime(in_d_str, '%Y-%m-%d'):
                    trans_end = out_d_str
            except:
                pass

        inter_transits.append({
            'id': f'TR-{bc}-{s_idx+1:02d}',
            'sessionOrder': s_idx + 1,
            'fromStage': s_from['stage'],
            'toStage': s_to['stage'],
            'fromWorkshop': from_loc,
            'toWorkshop': to_loc,
            'startDate': trans_start or None,
            'endDate': trans_end or None,
            'transitDays': t_days,
            'transitHours': t_hrs,
            'isLongRetention': is_transit_long,
            'subcontractor': sub_name or None,
            'status': 'completed',
            'notes': f"[{from_loc}] 출하 후 [{to_loc}] 입고까지 대차/물류 {t_days:.1f}일 ({t_hrs:.1f}시간) 체류" + (" (🚨 10일 이상 장기이동 경고)" if is_transit_long else "")
        })

    # Priority
    priority = 'urgent' if lt_days > 35 else ('high' if out_vendor else 'normal')
    due_date = (datetime.strptime(last_date_str, '%Y-%m-%d') + timedelta(days=2)).strftime('%Y-%m-%d')

    item = {
        'id': f'WO-{bc}',
        'barcode': bc,
        'orderNumber': f'WO-{bc}',
        'productCode': pcode,
        'productName': pname,
        'itemType': '반도체 전극' if 'Talon' in pname else '반도체 에칭 링',
        'productType': 'Silicon Electrode' if 'Talon' in pname else 'Silicon Ring',
        'quantity': 20 if 'Talon' in pname else 25,
        'dueDate': due_date,
        'createdAt': f'{first_date_str}T08:00:00Z',
        'priority': priority,
        'customer': 'Applied Materials Korea' if 'Talon' in pname else 'Lam Research 코리아 팹',
        'currentStageIndex': 8,
        'currentWorkshop': '2동-세정/완제품처리',
        'currentStatusText': '완제품처리 완료 (전 공정 100% 합격)',
        'subcontractor': out_vendor or None,
        'subcontractorOutDate': out_out_date or None,
        'subcontractorInDate': out_in_date or None,
        'subcontractorLeadDays': out_retention,
        'subcontractorProcesses': sorted(list(out_processes)) if out_processes else (['단폴리싱'] if '온테크놀로지' in str(out_vendor) else (['면가공', '외경가공', 'CORE', 'HOLE'] if '에스와이텍' in str(out_vendor) else None)),
        'subcontractorStatus': sub_status,
        'status': 'completed',
        'overallProgress': 100,
        'totalPlannedMinutes': 420,
        'totalActualMinutes': round(st_minutes),
        'netSTMinutes': round(st_minutes, 1),
        'transferMinutes': round(transfer_hrs * 60),
        'queueMinutes': round(queue_hrs * 60),
        'totalLeadTimeHours': total_lt_hrs,
        'leadTimeDays': lt_days,
        'adjustedLeadTimeDays': adj_lt_days,
        'isLTExcluded': is_excluded,
        'ltExclusionReason': ex_reason or None,
        'ltExclusionDays': ex_days if is_excluded else 0,
        'ltExclusionDate': ex_date or None,
        'ltExclusionHistory': ex_hist,
        'dailyTimeline': daily_timeline,
        'steps': steps,
        'interStageTransits': inter_transits,
        'hasLongRetentionAlert': any(s.get('isLongRetention', False) for s in steps) or any(t.get('isLongRetention', False) for t in inter_transits),
        'maxStageDwellDays': max([s.get('dwellDays', 0) for s in steps] + [t.get('transitDays', 0) for t in inter_transits], default=0),
        'longRetentionStageName': next((s['stage'] for s in steps if s.get('isLongRetention', False)), next((f"{t['fromStage']}➔{t['toStage']} 이동중" for t in inter_transits if t.get('isLongRetention', False)), None)),
        'historyLogs': history_logs,
        'notes': f'실제 공장 생산 로그 {len(r_list)}건 연동'
    }
    WORKORDERS.append(item)

# Add 25th work order: active shopfloor work order WO-100249112 currently running in October
active_timeline_25 = {}
for d_day in october_dates:
    day_num = int(d_day.split('-')[2])
    if day_num < 25:
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': '입고전',
            'workshop': '자재창고',
            'statusText': '원소재 잉곳 입고 대기',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': None,
            'stageDwellDaysOnDate': 0,
            'isLongRetentionOnDate': False
        }
    elif day_num == 25:
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': '소재가공',
            'workshop': '5동-소재공정',
            'statusText': '워터젯 CORE 정밀 절단 착수',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': None,
            'activeEquipment': '워터젯 (PR-WJ-001)',
            'stageDwellDaysOnDate': 1.0,
            'isLongRetentionOnDate': False
        }
    elif day_num == 26:
        # Transit between 5동 and C2 then 1차 가공
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': '1차가공',
            'workshop': 'C2 1차가공 S 2',
            'statusText': '횡로타리 면가공 1차 완료',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': '5동-소재공정 ➔ C2 1차가공 S 2',
            'activeEquipment': '횡로타리 #3 (PR-AG-503)',
            'stageDwellDaysOnDate': 1.0,
            'isLongRetentionOnDate': False
        }
    elif day_num in [27, 28]:
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': '정밀가공',
            'workshop': 'C2 CNC-S 3 MCT',
            'statusText': 'OKUMA MCT#11 5축 드릴/내경 초정밀 가공 진행중 (현재 가동)',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': None,
            'activeEquipment': 'OKUMA MCT#11 (PR-OK-511)',
            'stageDwellDaysOnDate': 2.0 if day_num == 27 else 3.0,
            'isLongRetentionOnDate': False
        }
    elif day_num in [29, 30]:
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': 'ED',
            'workshop': '2동-EP',
            'statusText': '표면 산화피막 에칭 반응조 예정',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': 'C2 CNC-S 3 MCT ➔ 2동-EP',
            'stageDwellDaysOnDate': 1.0 if day_num == 29 else 2.0,
            'isLongRetentionOnDate': False
        }
    else:
        active_timeline_25[d_day] = {
            'date': d_day,
            'stage': 'EP',
            'workshop': '1동-단폴리싱',
            'statusText': '단 Polishing 단차 가공 예정',
            'isOutsourced': False,
            'isInTransit': False,
            'transitRoute': '2동-EP ➔ 1동-단폴리싱',
            'stageDwellDaysOnDate': 1.0,
            'isLongRetentionOnDate': False
        }

wo_25 = {
    'id': 'WO-100249112',
    'barcode': '100249112',
    'orderNumber': 'WO-100249112',
    'productCode': 'PYLR2-230066A',
    'productName': 'Flex HxP Outer Ring',
    'itemType': '반도체 에칭 링',
    'productType': 'Silicon Ring',
    'quantity': 25,
    'dueDate': '2026-10-31',
    'createdAt': '2026-10-25T08:00:00Z',
    'priority': 'urgent',
    'customer': 'Lam Research 코리아 팹',
    'currentStageIndex': 2,
    'currentWorkshop': 'C2 CNC-S 3 MCT',
    'currentStatusText': 'OKUMA MCT#11 정밀가공 가동중 (부하율 97%)',
    'subcontractor': None,
    'subcontractorStatus': '해당없음',
    'status': 'in_progress',
    'overallProgress': 40,
    'totalPlannedMinutes': 420,
    'totalActualMinutes': 195,
    'netSTMinutes': 195.0,
    'transferMinutes': 150,
    'queueMinutes': 3975,
    'totalLeadTimeHours': 72.0,
    'leadTimeDays': 3.0,
    'adjustedLeadTimeDays': 3.0,
    'isLTExcluded': False,
    'ltExclusionReason': None,
    'ltExclusionDays': 0,
    'dailyTimeline': active_timeline_25,
    'steps': [
        {
            'stage': '소재가공',
            'stageCode': 'CORE (A004)',
            'order': 1,
            'status': 'completed',
            'plannedSTMinutes': 25,
            'actualMinutes': 15,
            'startedAt': '2026-10-25T09:00:00Z',
            'completedAt': '2026-10-25T09:15:00Z',
            'firstInDate': '2026-10-25',
            'lastOutDate': '2026-10-25',
            'assignedEquipmentId': 'EQ-WJ-001',
            'assignedEquipmentCode': 'PR-WJ-001',
            'assignedEquipmentName': '워터젯 (PR-WJ-001)',
            'workshop': '5동-소재공정',
            'operatorId': 'OP-주보성',
            'operatorName': '주보성',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': 0.8,
            'dwellHours': 18.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '워터젯 정밀 절단 완료 (대기체류 18.0h)'
        },
        {
            'stage': '1차가공',
            'stageCode': '면/외경 (A041, A057)',
            'order': 2,
            'status': 'completed',
            'plannedSTMinutes': 45,
            'actualMinutes': 40,
            'startedAt': '2026-10-26T08:30:00Z',
            'completedAt': '2026-10-26T12:00:00Z',
            'firstInDate': '2026-10-25',
            'lastOutDate': '2026-10-26',
            'assignedEquipmentId': 'EQ-AG-503',
            'assignedEquipmentCode': 'PR-AG-503',
            'assignedEquipmentName': '횡로타리 #3 (PR-AG-503)',
            'workshop': 'C2 1차가공 S 2',
            'operatorId': 'OP-이현준',
            'operatorName': '이현준',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': 0.8,
            'dwellHours': 18.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '1차가공 연삭 완료 (대기체류 18.0h)'
        },
        {
            'stage': '정밀가공',
            'stageCode': 'MCT/Drill (A008, A030, A065)',
            'order': 3,
            'status': 'in_progress',
            'plannedSTMinutes': 180,
            'actualMinutes': 140,
            'startedAt': '2026-10-27T08:00:00Z',
            'completedAt': None,
            'firstInDate': '2026-10-26',
            'lastOutDate': None,
            'assignedEquipmentId': 'EQ-OK-511',
            'assignedEquipmentCode': 'PR-OK-511',
            'assignedEquipmentName': 'OKUMA MCT#11 (PR-OK-511)',
            'workshop': 'C2 CNC-S 3 MCT',
            'operatorId': 'OP-정진현',
            'operatorName': '정진현',
            'defectCount': 0,
            'goodCount': 25,
            'dwellDays': 1.3,
            'dwellHours': 30.3,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': 'OKUMA MCT#11 5축 드릴/내경 초정밀 가공 진행중 (체류 30.3h)'
        },
        {
            'stage': 'ED',
            'stageCode': '면 에칭 (A040)',
            'order': 4,
            'status': 'ready',
            'plannedSTMinutes': 20,
            'actualMinutes': None,
            'startedAt': None,
            'completedAt': None,
            'assignedEquipmentId': 'EQ-ET-001',
            'assignedEquipmentCode': 'PR-ET-001',
            'assignedEquipmentName': '에칭 표면반응조',
            'workshop': '2동-EP',
            'operatorId': None,
            'operatorName': None,
            'defectCount': 0,
            'goodCount': 0,
            'dwellDays': 0.0,
            'dwellHours': 0.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '정밀가공 완료 후 에칭 투입 대기'
        },
        {
            'stage': 'EP',
            'stageCode': '단폴리싱 (A073)',
            'order': 5,
            'status': 'pending',
            'plannedSTMinutes': 120,
            'actualMinutes': None,
            'startedAt': None,
            'completedAt': None,
            'assignedEquipmentId': 'EQ-PL-024',
            'assignedEquipmentCode': 'PR-PL-024',
            'assignedEquipmentName': '단 Polishing M/C #11',
            'workshop': '1동-단폴리싱',
            'operatorId': None,
            'operatorName': None,
            'defectCount': 0,
            'goodCount': 0,
            'dwellDays': 0.0,
            'dwellHours': 0.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '단차 경면연마 투입 대기'
        },
        {
            'stage': 'CMP',
            'stageCode': '초평탄화 (A069)',
            'order': 6,
            'status': 'pending',
            'plannedSTMinutes': 30,
            'actualMinutes': None,
            'startedAt': None,
            'completedAt': None,
            'assignedEquipmentId': 'EQ-CP-005',
            'assignedEquipmentCode': 'PR-CP-005',
            'assignedEquipmentName': 'CMP 4HEAD #5',
            'workshop': '2동-CP',
            'operatorId': None,
            'operatorName': None,
            'defectCount': 0,
            'goodCount': 0,
            'dwellDays': 0.0,
            'dwellHours': 0.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '화학기계 초평탄화 투입 대기'
        },
        {
            'stage': '세정',
            'stageCode': '초음파세정 (A049)',
            'order': 7,
            'status': 'pending',
            'plannedSTMinutes': 15,
            'actualMinutes': None,
            'startedAt': None,
            'completedAt': None,
            'assignedEquipmentId': 'EQ-CL-001',
            'assignedEquipmentCode': 'PR-CL-001',
            'assignedEquipmentName': 'RING 세정 1조',
            'workshop': '2동-세정',
            'operatorId': None,
            'operatorName': None,
            'defectCount': 0,
            'goodCount': 0,
            'dwellDays': 0.0,
            'dwellHours': 0.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '초순수 세정 투입 대기'
        },
        {
            'stage': '포장',
            'stageCode': '검사/포장 (A025, A068)',
            'order': 8,
            'status': 'pending',
            'plannedSTMinutes': 15,
            'actualMinutes': None,
            'startedAt': None,
            'completedAt': None,
            'assignedEquipmentId': 'EQ-PK-014',
            'assignedEquipmentCode': 'PR-ZZ-014',
            'assignedEquipmentName': '포장테이블 (PR-ZZ-014)',
            'workshop': '2동-세정/포장',
            'operatorId': None,
            'operatorName': None,
            'defectCount': 0,
            'goodCount': 0,
            'dwellDays': 0.0,
            'dwellHours': 0.0,
            'isLongRetention': False,
            'dwellAlertReason': None,
            'notes': '최종 검사 및 진공 포장 투입 대기'
        }
    ],
    'historyLogs': [
        {
            'id': 'EV-100249112-001',
            'category': '공정생산',
            'date': '2026-10-25',
            'actionType': '완료',
            'stepSeq': 20,
            'processCode': 'A004',
            'processName': 'CORE',
            'equipmentCode': 'PR-WJ-001',
            'equipmentName': '워터젯',
            'startTime': '2026-10-25 09:00:00',
            'endTime': '2026-10-25 09:15:00',
            'workerName': '주보성',
            'workshop': '5동-소재공정',
            'statusText': '완료'
        },
        {
            'id': 'EV-100249112-002',
            'category': '작업장이동',
            'date': '2026-10-25',
            'actionType': '이동출고',
            'processName': '이동출고',
            'workerName': '최정대',
            'workshop': '이동중',
            'workshopFrom': '5동-소재공정',
            'statusText': '창고입고'
        },
        {
            'id': 'EV-100249112-003',
            'category': '작업장이동',
            'date': '2026-10-25',
            'actionType': '이동입고',
            'processName': '이동입고',
            'workerName': '최정대',
            'workshop': 'C2 1차가공 S 2',
            'workshopFrom': '이동중',
            'statusText': '창고입고'
        },
        {
            'id': 'EV-100249112-004',
            'category': '공정생산',
            'date': '2026-10-26',
            'actionType': '완료',
            'stepSeq': 30,
            'processCode': 'A041',
            'processName': '면가공',
            'equipmentCode': 'PR-AG-503',
            'equipmentName': '횡로타리 #3',
            'startTime': '2026-10-26 08:30:00',
            'endTime': '2026-10-26 12:00:00',
            'workerName': '이현준',
            'workshop': 'C2 1차가공 S 2',
            'statusText': '창고입고'
        },
        {
            'id': 'EV-100249112-005',
            'category': '작업장이동',
            'date': '2026-10-26',
            'actionType': '이동출고',
            'processName': '이동출고',
            'workerName': '정수명',
            'workshop': '이동중',
            'workshopFrom': 'C2 1차가공 S 2',
            'statusText': '창고입고'
        },
        {
            'id': 'EV-100249112-006',
            'category': '작업장이동',
            'date': '2026-10-26',
            'actionType': '이동입고',
            'processName': '이동입고',
            'workerName': '조영한',
            'workshop': 'C2 CNC-S 3 MCT',
            'workshopFrom': '이동중',
            'statusText': '창고입고'
        },
        {
            'id': 'EV-100249112-007',
            'category': '공정생산',
            'date': '2026-10-27',
            'actionType': '완료',
            'stepSeq': 90,
            'processCode': 'A030',
            'processName': '내경/내단가공',
            'equipmentCode': 'PR-OK-511',
            'equipmentName': 'OKUMA MCT#11',
            'startTime': '2026-10-27 08:00:00',
            'workerName': '정진현',
            'workshop': 'C2 CNC-S 3 MCT',
            'statusText': '가동중'
        }
    ],
    'interStageTransits': [
        {
            'id': 'TR-100249112-01',
            'sessionOrder': 1,
            'fromStage': '소재가공',
            'toStage': '1차가공',
            'fromWorkshop': '5동-소재공정',
            'toWorkshop': 'C2 1차가공 S 2',
            'startDate': '2026-10-25',
            'endDate': '2026-10-25',
            'transitDays': 0.03,
            'transitHours': 0.8,
            'isLongRetention': False,
            'status': 'completed',
            'notes': '5동 절단 완료 후 C2동 1차가공실 대차 이송 완료 (0.8h)'
        },
        {
            'id': 'TR-100249112-02',
            'sessionOrder': 2,
            'fromStage': '1차가공',
            'toStage': '정밀가공',
            'fromWorkshop': 'C2 1차가공 S 2',
            'toWorkshop': 'C2 CNC-S 3 MCT',
            'startDate': '2026-10-26',
            'endDate': '2026-10-26',
            'transitDays': 0.03,
            'transitHours': 0.7,
            'isLongRetention': False,
            'status': 'completed',
            'notes': '면가공 완료 후 OKUMA MCT#11 설비로 대차 이송 (0.7h)'
        },
        {
            'id': 'TR-100249112-03',
            'sessionOrder': 3,
            'fromStage': '정밀가공',
            'toStage': 'ED',
            'fromWorkshop': 'C2 CNC-S 3 MCT',
            'toWorkshop': '2동-EP',
            'startDate': '2026-10-28',
            'endDate': '2026-10-29',
            'transitDays': 0.04,
            'transitHours': 1.0,
            'isLongRetention': False,
            'status': 'in_transit',
            'notes': 'C2동 MCT 완료 후 2동 에칭실로 대차 이동중 (1.0h)'
        },
        {
            'id': 'TR-100249112-04',
            'sessionOrder': 4,
            'fromStage': 'ED',
            'toStage': 'EP',
            'fromWorkshop': '2동-EP',
            'toWorkshop': '1동-단폴리싱',
            'startDate': None,
            'endDate': None,
            'transitDays': 0.0,
            'transitHours': 0.0,
            'isLongRetention': False,
            'status': 'pending',
            'notes': '2동 에칭 후 1동 단폴리싱실 이동 대기 (예정 0.0h)'
        },
        {
            'id': 'TR-100249112-05',
            'sessionOrder': 5,
            'fromStage': 'EP',
            'toStage': 'CMP',
            'fromWorkshop': '1동-단폴리싱',
            'toWorkshop': '2동-CP',
            'startDate': None,
            'endDate': None,
            'transitDays': 0.0,
            'transitHours': 0.0,
            'isLongRetention': False,
            'status': 'pending',
            'notes': '1동 단폴리싱 후 2동 CMP실 이동 대기 (예정 0.0h)'
        },
        {
            'id': 'TR-100249112-06',
            'sessionOrder': 6,
            'fromStage': 'CMP',
            'toStage': '세정',
            'fromWorkshop': '2동-CP',
            'toWorkshop': '2동-세정',
            'startDate': None,
            'endDate': None,
            'transitDays': 0.0,
            'transitHours': 0.0,
            'isLongRetention': False,
            'status': 'pending',
            'notes': 'CMP 후 초순수 세정실 이동 대기 (예정 0.0h)'
        },
        {
            'id': 'TR-100249112-07',
            'sessionOrder': 7,
            'fromStage': '세정',
            'toStage': '포장',
            'fromWorkshop': '2동-세정',
            'toWorkshop': '2동-세정/포장',
            'startDate': None,
            'endDate': None,
            'transitDays': 0.0,
            'transitHours': 0.0,
            'isLongRetention': False,
            'status': 'pending',
            'notes': '세정 후 최종 3D검사 및 진공포장 이동 대기 (예정 0.0h)'
        }
    ],
    'hasLongRetentionAlert': False,
    'maxStageDwellDays': 4.5,
    'longRetentionStageName': None,
    'notes': 'C2 CNC OKUMA MCT#11 긴급 주문 가공'
}
WORKORDERS.append(wo_25)

print(f'Total work orders prepared: {len(WORKORDERS)}')

# Write TypeScript file
ts_output = '''import { WorkOrder } from '../types/mes';

/**
 * 25개 실제 작업지시서 전체 데이터셋
 * - 공장 CSV 실데이터 1,061건 이벤트 기반 24건 + 현장 가동중 활성 지시서 1건 (총 25건)
 * - 실제 ST 시간 (순수 가공시간) vs 이동중 소요시간 (물류이동) vs 대기시간 분리 산출
 * - 외주 12개 지시서 (주식회사 에스와이텍, 주식회사 온테크놀로지) 체류일수/외주출입고 관리
 * - 2026년 10월 1일 ~ 31일 일자별 공정 위치 시뮬레이션 타임라인 포함
 * - 특정 LT 초과건 LT 제외 및 재개 이력 추적
 */
export const ALL_WORK_ORDERS_25: WorkOrder[] = ''' + json.dumps(WORKORDERS, ensure_ascii=False, indent=2) + ''';
'''

with open('src/data/allWorkOrders25.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print('Successfully written to src/data/allWorkOrders25.ts')
