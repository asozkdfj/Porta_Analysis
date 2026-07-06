# Porta Analysis

반도체 테스트 데이터를 분석하는 **Porta** 웹 대시보드입니다.  
CSV를 `inbox` 폴더에 넣고 브라우저에서 불러와 GRR, Error Analysis, Tact Time 등을 확인할 수 있습니다.

## 주요 기능

- **GRR / LIW Linearity** — 반복성·선형성 분석
- **Error Analysis** — Fail Map, UPH, Trend, PPT용 Summary PNG
- **Tact Time** — Station별 사이클 분석
- **Temperature Tracking** — 온도 추이
- **Portable 배포** — Node.js 설치 없이 `Start-Porta.bat` 실행

## 프로젝트 구조

```
Gaia/
├── gaia-web/          # Next.js 소스 (개발·빌드)
│   ├── portable/      # Porta-portable 런처 (bat)
│   └── inbox/         # Inbox 폴더 구조 (CSV는 Git 제외)
└── README.md
```

## 개발 환경

```bash
cd gaia-web
npm install
npm run dev
```

→ http://localhost:3000

## 포터블 빌드 (설비 배포)

```bash
cd gaia-web
npm run build:portable
```

→ `Porta-portable/` 폴더 생성 (ZIP으로 배포, Git에는 포함하지 않음)

## Inbox 사용법

1. `Porta-portable/inbox/` 하위에 모듈별 폴더에 CSV 복사  
   (`grr/`, `liw/`, `error-analysis/`, `tact-time/Station1~8/` 등)
2. `Start-Porta.bat` 실행
3. 해당 메뉴에서 **최신 파일 불러오기**

> **참고:** 실측 CSV는 `.gitignore`로 GitHub에 올라가지 않습니다.

## 라이선스

Private / Internal use — 저장소 소유자 정책에 따릅니다.
