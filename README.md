# AZDKS — 알잘딱깔쏀 🦎

> 파일을 드래그 앤 드롭하면 귀여운 게코 캐릭터 **꼬미**가 냠냠 먹고 알아서 정리해주는 데스크탑 앱

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)
![Framework](https://img.shields.io/badge/framework-Tauri%20v2-blue)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 주요 기능

### 🐾 꼬미 캐릭터
파일을 드래그하면 꼬미가 입을 벌리고 냠냠 먹어요. 정리 완료되면 기뻐하고, 모르겠는 파일엔 당황해요.

| 상태 | 설명 |
|------|------|
| 😌 idle | 둥실둥실 대기 중 |
| 👀 hover | 파일 위에 올라왔을 때 |
| 🍴 eating | 파일 먹는 중 |
| 🎉 happy | 정리 완료! |
| 😵 confused | 어디 넣을지 모를 때 |

---

### 🧠 4가지 분류 모드

드롭 전에 원하는 정리 방식을 선택할 수 있어요.

| 모드 | 설명 |
|------|------|
| 🔮 **스마트** | 키워드·프로젝트·확장자를 종합해서 최적 분류 |
| 📅 **날짜별** | 파일 실제 생성일 기준으로 `연/월` 폴더 정리 |
| 📁 **프로젝트별** | 파일명에서 프로젝트·주제를 추출해서 묶기 |
| 🗂️ **타입별** | 확장자 기준으로 이미지·문서·코드 등 분류 |

---

### 🗂️ 스마트 분류 엔진 (API 없음, 완전 로컬)

```
드롭
 │
 ├─ 1. 사용자 규칙 매칭 (rules.json) → 즉시 이동
 ├─ 2. 키워드 분석 (50+ 패턴: SNS, 여행, 디자인, 영수증...)
 ├─ 3. 프로젝트 감지 (브랜드명, 한국어, CamelCase 파싱)
 ├─ 4. 확장자 기반 타입 분류
 └─ 5. 신뢰도 스코어링 → 최적 결과 선택
```

점수가 비슷한 대안이 있으면 사용자에게 선택지를 보여줘요:

```
🖼️ KakaoTalk_design_mockup.png
어디에 넣을까요?
🥇 SNS / 카카오          95%  ← 클릭
🥈 디자인 / 작업물       88%  ← 클릭
         [📂 직접 지정] [건너뛰기]
```

---

### 📊 신뢰도 시스템

| 신뢰도 | 동작 |
|--------|------|
| 90% 이상 | 자동 이동 (알림만) |
| 60~90% | 토스트로 확인 요청 |
| 60% 미만 | 미분류 패널에서 직접 선택 |

---

## 🛠️ 기술 스택

```
Frontend  │ React 18 + TypeScript + Framer Motion
Backend   │ Tauri v2 (Rust) — 파일 시스템, 파일 이동
분류 엔진 │ 로컬 TS 로직 (API 호출 없음, 완전 무료)
저장      │ rules.json, history.json (로컬)
빌드      │ macOS .dmg / Windows .exe
```

---

## 🚀 실행 방법

### 사전 준비

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- [Tauri 사전 요구사항](https://tauri.app/start/prerequisites/)

### 개발 서버 실행

```bash
cd azdks-app
npm install
npm run tauri dev
```

> 첫 실행 시 Rust 컴파일로 2~3분 소요. 이후는 빠릅니다.

### 빌드

```bash
npm run tauri build
```

---

## 📁 프로젝트 구조

```
azdks-app/
├── src/
│   ├── components/
│   │   ├── Gecko.tsx              # 꼬미 캐릭터 (이미지 + Framer Motion)
│   │   ├── ModeSelector.tsx       # 분류 모드 선택 탭
│   │   ├── ToastNotification.tsx  # 분류 결과 선택지 토스트
│   │   ├── UnclassifiedPanel.tsx  # 미분류 파일 직접 지정
│   │   ├── HistoryList.tsx        # 정리 내역
│   │   ├── Settings.tsx           # 설정 화면
│   │   └── Onboarding.tsx         # 첫 실행 마법사
│   ├── engine/
│   │   ├── classifier.ts          # 분류 핵심 로직 + 4가지 모드
│   │   ├── classificationMode.ts  # 모드 타입 정의
│   │   ├── dateClassifier.ts      # 날짜별 분류 (메타데이터 기반)
│   │   ├── projectDetector.ts     # 프로젝트명 추출 엔진
│   │   ├── keywordAnalyzer.ts     # 50+ 키워드 패턴 분석
│   │   ├── patternMatcher.ts      # Glob 패턴 매칭
│   │   └── confidenceCalc.ts      # 신뢰도 계산
│   ├── store/
│   │   ├── rulesStore.ts          # rules.json 관리
│   │   └── historyStore.ts        # 정리 히스토리
│   └── hooks/
│       ├── useDropZone.ts
│       └── useClassifier.ts
└── src-tauri/
    └── src/
        └── lib.rs                 # 파일 이동, 메타데이터, 트레이
```

---

## 🦎 꼬미 (Kkomi)

크레스티드 게코에서 영감받은 오리지널 캐릭터. 통통한 콩 모양 몸체, 세로 동공, 머리 위 작은 볏, 베이지/크림 색감. 카카오프렌즈 감성.

---

## 📝 라이선스

MIT
