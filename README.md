# AZDKS — 알잘딱깔쎈

> 파일을 드래그 앤 드롭하면 알아서 분류하고 정리해주는 macOS 데스크탑 앱.
> API 없음. 완전 로컬. 무료.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Framework](https://img.shields.io/badge/framework-Tauri%20v2-blue)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 어떤 앱인가요?

파일을 앱에 드롭하면 **"이 파일이 무엇인지"** 스스로 판단해서 적절한 폴더로 이동시켜줘요.

스크린샷은 스크린샷 폴더로, iPhone으로 찍은 사진은 사진 폴더로, Figma 익스포트 파일은 디자인 폴더로 — 자동으로. `azdks_mockup_v3.png`를 드롭하면 "AZDKS 프로젝트예요?" 한 번 물어보고, 다음부터는 `azdks_`로 시작하는 파일은 전부 알아서 그 프로젝트 폴더로 보내줘요.

모든 파일은 `~/AZDKS/` 하나의 폴더 안에 정리돼요.

---

## 주요 기능

### 스마트 분류 엔진 (V3)

파일을 분석할 때 7개 레이어를 순서대로 확인해요.

```
[1] 저장된 규칙          → 사용자가 직접 만든 규칙, 항상 최우선
[2] 프로젝트 키워드 매칭  → 한 번 지정한 프로젝트, 다음부터 자동
[3] Spotlight 스크린샷   → kMDItemIsScreenCapture = true → 99%
[4] Spotlight 카메라     → kMDItemAcquisitionMake (iPhone/Canon 등) → 90-96%
[5] Spotlight 제작 앱    → kMDItemCreator (Figma/Word/Photoshop 등) → 94%
[6] 다운로드 출처 URL    → kMDItemWhereFroms (Instagram/GitHub 등) → 88-97%
[7] 파일명 키워드         → 250+ 패턴 (SNS/여행/디자인/문서/게임 등)
[8] 확장자 폴백           → yaml→개발, mp4→영상, pdf→문서 등
```

macOS Spotlight 메타데이터를 직접 읽기 때문에 파일명이 `image_001.jpg`처럼 무의미해도 어디서 왔는지, 어떤 카메라로 찍었는지 정확히 알 수 있어요.

### 프로젝트 기반 정리

타입별(이미지/문서/코드)로 흩어지는 게 아니라, **프로젝트 단위**로 관련 파일을 한 폴더에 모아요.

```
~/AZDKS/
  AZDKS프로젝트/
    ui_mockup_v3.png
    proposal.pdf
    data.xlsx
  취준/
    이력서_2024.pdf
    포트폴리오.pptx
    portfolio_photo.jpg
  일본여행_2024/
    osaka_day1.jpg
    항공권.pdf
    일정표.xlsx
```

처음 드롭할 때 한 번만 "어느 프로젝트예요?" 물어보고, 이후 같은 키워드가 포함된 파일은 자동으로 그 프로젝트 폴더로 이동해요.

### 신뢰도 시스템

| 신뢰도 | 동작 |
|--------|------|
| 90% 이상 | 묻지 않고 자동 이동 |
| 60~90% | 토스트로 확인 요청 (대안 폴더도 함께 표시) |
| 60% 미만 | 프로젝트 선택 화면 표시 |

### 기타 기능

- **되돌리기** — 이동 직후 `⌘Z` 또는 플로팅 버튼으로 원위치 복구 (최대 10개)
- **중복 감지** — 목적 폴더에 같은 이름 파일이 있으면 덮어쓰기 여부 확인
- **파일 탐색기** — 앱 내에서 `~/AZDKS` 폴더 트리 탐색 + 빠른 검색
- **통계 대시보드** — 카테고리별 분포, 최근 7일 활동 그래프
- **정리 내역** — 이동한 파일 기록, 폴더명 클릭으로 Finder에서 열기
- **키보드 단축키** — `⌘O` 파일열기 / `⌘Z` 되돌리기 / `⌘1~4` 패널 / `ESC` 닫기

---

## 분류 상세

### Spotlight 기반 감지 (macOS 전용)

| 신호 | 예시 | 결과 |
|------|------|------|
| `kMDItemIsScreenCapture` | macOS 스크린샷 | 스크린샷/ (99%) |
| `kMDItemAcquisitionMake` | Apple → iPhone | 사진/iPhone (96%) |
| `kMDItemAcquisitionMake` | Canon → DSLR | 사진/카메라 (90%) |
| `kMDItemCreator` | Figma | 디자인/Figma (94%) |
| `kMDItemCreator` | Microsoft Word | 문서/Word (94%) |
| `kMDItemWhereFroms` | instagram.com | SNS/인스타그램 (95%) |
| `kMDItemWhereFroms` | github.com | 개발/GitHub (95%) |
| `kMDItemDurationSeconds` | 영상 90초 미만 | 영상/숏폼 (82%) |
| `kMDItemNumberOfPages` | PDF 1페이지 | 문서/영수증 (70%) |
| `kMDItemAudioBitRate` | 900kbps 초과 | 음악/무손실 (82%) |

### 파일명 키워드 (250+ 패턴)

| 카테고리 | 커버 범위 |
|----------|-----------|
| SNS | 카카오톡, 인스타, X, Discord, Telegram, TikTok, Reddit, Twitch 등 19개 플랫폼 |
| 여행 | 일본, 한국, 미국, 유럽, 태국, 베트남, 대만 등 14개 국가/도시 |
| 디자인 | 로고, 아이콘, 배너, 썸네일, UI/UX, 3D, 타이포그래피 등 |
| 문서 | 계약서, 이력서, 영수증, 청구서, 보험, 세금, 신분증 등 |
| 개발 | API, DevOps, 로그, DB, git, 테스트, 디자인토큰 등 |
| 게임 | LoL, Valorant, 마인크래프트, 오버워치 등 |
| 기타 | 음악, 영상, 건강, 부동산, 쇼핑, 학업 등 |

### 파일 크기 기반 추론

| 조건 | 분류 |
|------|------|
| RAW 확장자 + 15MB 이상 | 사진/RAW |
| 영상 + 2GB 이상 | 영상/원본 |
| 영상 + 3MB 미만 | 영상/숏폼 |
| FLAC/WAV + 30MB 이상 | 음악/무손실 |

---

## 기술 스택

```
Frontend   React 18 + TypeScript + Framer Motion
Backend    Tauri v2 (Rust) — 파일 이동, Spotlight mdls 호출, 시스템 트레이
분류 엔진  100% 로컬 TypeScript — API 없음, 인터넷 연결 불필요
저장       rules.json / history.json / projects.json (AppData 로컬)
플랫폼     macOS (Spotlight 풀 지원) / Windows (키워드+확장자 기반)
```

---

## 실행 방법

### 사전 요구사항

- Node.js 18+
- Rust (https://rustup.rs)
- Tauri 사전 요구사항 (https://tauri.app/start/prerequisites/)

### 개발 서버

```bash
cd azdks-app
npm install
npm run tauri dev
```

> 첫 실행 시 Rust 컴파일로 2~3분 소요. 이후 재실행은 빠릅니다.

### 프로덕션 빌드

```bash
npm run tauri build
```

---

## 프로젝트 구조

```
azdks-app/
├── src/
│   ├── components/
│   │   ├── Gecko.tsx              # SVG 슬라임 캐릭터 (5가지 상태 애니메이션)
│   │   ├── ProjectPicker.tsx      # 프로젝트 선택/생성 UI
│   │   ├── ToastNotification.tsx  # 분류 확인 토스트 (대안 선택 포함)
│   │   ├── UnclassifiedPanel.tsx  # 미분류 파일 Finder로 폴더 지정
│   │   ├── StatsPanel.tsx         # 통계 대시보드
│   │   ├── FileExplorer.tsx       # 파일 탐색기 (트리 + 검색)
│   │   ├── HistoryList.tsx        # 정리 내역
│   │   ├── Settings.tsx           # 설정
│   │   └── Onboarding.tsx         # 첫 실행 온보딩
│   ├── engine/
│   │   ├── smartClassifier.ts     # 메인 분류 엔진 (7단계 파이프라인)
│   │   ├── analyzer.ts            # Spotlight 메타데이터 파싱
│   │   ├── keywordAnalyzer.ts     # 250+ 키워드/패턴 분석
│   │   ├── classifier.ts          # 분류 결과 타입 정의
│   │   ├── confidenceCalc.ts      # 신뢰도 계산
│   │   └── patternMatcher.ts      # Glob 패턴 매칭
│   ├── store/
│   │   ├── rulesStore.ts          # 사용자 규칙 관리
│   │   ├── historyStore.ts        # 정리 내역 관리
│   │   └── projectStore.ts        # 프로젝트 관리 + 키워드 매칭
│   └── hooks/
│       ├── useDropZone.ts         # 드래그 앤 드롭
│       └── useClassifier.ts       # 분류 파이프라인 실행
└── src-tauri/src/
    └── lib.rs                     # 파일 이동, mdls 호출, 트레이, 파일 탐색
```

---

## 라이선스

MIT
