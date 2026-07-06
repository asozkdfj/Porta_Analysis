# GAIA Web MVP

CSV 기반 센서/광학 테스트 데이터를 **FFBP / Ranging / JC / LIW** 그룹별로 분석하고, 소켓·시리얼 기준 GRR 상태를 웹 UI에서 확인하는 도구입니다.

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | **Next.js 15 (App Router) + React 19** | 풀스택 단일 repo, 빠른 MVP, 추후 API/SSR 확장 용이 |
| 언어 | **TypeScript** | CSV/GRR 도메인 타입 안정성 |
| 스타일 | **Tailwind CSS** | 빠른 UI 프로토타이핑 |
| UI | **shadcn/ui 스타일 (Radix 기반)** | 접근성·일관된 컴포넌트, 복사-소유 방식으로 단순 |
| 차트 | **Recharts** | GRR 산포/라인 차트를 빠르게 구현 |
| CSV | **PapaParse** | 대용량 스트리밍 파싱 준비 |
| 백엔드 | **Next.js API Routes** | 초기엔 클라이언트 분석, 서버 분석 API도 제공 |
| DB | **없음 (MVP)** | React state + mock CSV. 추후 Supabase/PostgreSQL 연결 |
| 배포 | **Vercel** (권장) | Next.js 최적 호스팅, `git push` 배포 |

## 폴더 구조

```
gaia-web/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 대시보드 진입
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts  # 서버 GRR 분석 API
│       └── health/route.ts
├── components/
│   ├── ui/                 # Button, Card, Tabs, Select...
│   ├── controls/           # CSV 업로드, 그룹/Metric 컨트롤
│   ├── charts/             # GRR / Ranging 차트
│   └── dashboard/          # 셸, 요약 패널
├── hooks/
│   └── useGaiaAnalysis.ts  # 클라이언트 분석 상태
├── lib/
│   ├── csv-parser.ts       # GAIA CSV 5행 구조 파싱
│   ├── groups.ts           # FFBP/Ranging/JC/LIW 헤더 매칭
│   ├── grr-calculator.ts   # 소켓 GRR 통계
│   ├── types.ts
│   └── mock-data.ts
└── data/
    └── mock-sample.csv
```

## 화면 구성 (MVP)

1. **대시보드 헤더** — GAIA 타이틀, 그룹 설명
2. **설정/컨트롤 패널 (좌측)**
   - CSV 업로드 / Mock 로드
   - 그룹 탭 (FFBP, Ranging, JC, LIW)
   - LIW 50C/20C 분기
   - Metric / 기준 소켓 / Serial 필터
3. **결과 영역 (우측)**
   - GRR 산포 차트 (기준 소켓 vs 의사 골든)
   - Ranging 그룹 시 소켓 오버레이 라인 차트
4. **요약 패널** — PASS/FAIL/CHECK KPI, 시리얼별 Range

## 시작하기

### 사전 요구사항

- Node.js 20+ ([nodejs.org](https://nodejs.org) 설치)

### 설치 & 실행

```powershell
cd c:\Users\HVS\Desktop\Gaia\gaia-web
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

### Mock으로 바로 체험

1. **Mock 데이터 로드** 클릭
2. 그룹 **LIW** 선택
3. Metric 선택 → 그래프·요약 확인

## API 예시

### Health Check

```http
GET /api/health
```

### GRR 분석 (서버)

```http
POST /api/analyze
Content-Type: application/json

{
  "csvText": "SerialNumber,TesterID,...",
  "group": "LIW",
  "metricHeader": "PROX::MOD_LIW50C_NTC_TEMP_PRE_25MA_70MA_AVG",
  "referenceSocket": "G_01",
  "serialFilter": "ALL"
}
```

PowerShell 예시:

```powershell
$body = @{
  csvText = Get-Content .\data\mock-sample.csv -Raw
  group = "LIW"
  metricHeader = "PROX::MOD_LIW50C_NTC_TEMP_PRE_25MA_70MA_AVG"
  referenceSocket = "G_01"
  serialFilter = "ALL"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/analyze -Method POST -Body $body -ContentType "application/json"
```

## 구현 로드맵

### 1단계 MVP (현재)
- [x] CSV 5행 구조 파싱
- [x] 그룹별 헤더 매칭 (LIW 포함 매칭)
- [x] 소켓 GRR 계산 + PASS/FAIL
- [x] 웹 UI (업로드, 컨트롤, 차트, 요약)
- [x] API Route `/api/analyze`

### 2단계 기능 확장
- [ ] GAIA spec 파일(Excel/CSV) 업로드 및 스펙 우선 적용
- [ ] 대용량 CSV 서버 스트리밍 파싱
- [ ] FFBP 중요 항목 존재 여부 PASS/FAIL
- [ ] JC GAIA STAT 전용 뷰
- [ ] 결과 CSV/PNG보내기

### 3단계 안정화
- [ ] Supabase/PostgreSQL — 분석 이력·설정 저장
- [ ] 인증/팀 공유
- [ ] E2E 테스트 (Playwright)
- [ ] Vercel 프로덕션 배포 + CI

## 다음 TODO

1. 실제 StargateL GRR CSV로 LIW 헤더 매칭 검증
2. `GaiaStat2grrConfig.csv` 스펙 파일 연동
3. 대용량 파일(200MB+) 업로드 — API + 청크 파싱
4. Ranging 전용 KPI (모듈별 stddev) 표시
5. 다크 모드 / 반응형 모바일 레이아웃
