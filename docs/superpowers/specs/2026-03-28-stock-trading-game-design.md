# Stock Trading Simulation Game — Design Spec

## Overview

과거 주식 데이터를 기반으로 매수/매도를 연습할 수 있는 트레이딩 시뮬레이션 게임. 트레이딩 능력 향상이 핵심 목적.

## Platform & Tech Stack

- **순수 프론트엔드 SPA** — 서버/DB 없음
- **React + Vite + TypeScript**
- **TradingView Lightweight Charts** — 캔들스틱, 거래량, 기술 지표
- **Yahoo Finance API** — CORS 프록시 경유 (공개 프록시 우선, 불안정시 자체 Cloudflare Workers/Vercel Edge Function 전환)
- **localStorage** — 게임 상태 영속화
- API 키 불필요 (Yahoo Finance 비공식 API는 키 없이 접근 가능)

## Supported Markets

- **한국 주식** — KOSPI (`.KS`), KOSDAQ (`.KQ`)
- **미국 주식** — NYSE/NASDAQ (티커 직접 입력)
- 유저가 종목을 직접 검색/선택

## Game Flow

```
[시작 화면]
  ├── 종목 검색/선택 (한국: .KS/.KQ, 미국: 티커)
  ├── 시작일 선택
  ├── 초기 자금 설정
  ├── 월급 설정 (금액, 날짜 — 선택사항)
  └── 모드 선택: 자유 / 챌린지
         │
         ▼
[게임 루프]
  ┌─── 장 시작 (한국 09:00, 미국 09:30) ───┐
  │  가격 실시간 재생 (보간 데이터)          │
  │  속도 조절: 1x / 2x / 5x / 10x         │
  │  일시정지 → 매수/매도 주문              │
  │  차트 시간 단위 전환 자유               │
  └─── 장 마감 (한국 15:30, 미국 16:00) ───┘
         │
         ▼
[일간 리뷰]
  ├── 오늘의 수익/손실 요약
  ├── 포트폴리오 현황
  ├── 이벤트 알림 (실적 발표 예정 등)
  ├── (매월) 월급 입금 알림
  └── "다음 날로" 버튼
         │
         ▼
  [게임 루프 반복 또는 게임 종료]
         │
         ▼
[결과 화면]
  ├── 성과 지표: 총 수익률, 최대 낙폭, 승률, 평균 손익비
  ├── 투입 자금 vs 최종 자산
  ├── 매매 타이밍 분석: 차트 위에 매수/매도 지점 표시
  ├── 거래 히스토리 전체 리뷰 (메모 포함)
  └── (챌린지) 미션 달성 여부
```

## Time Progression

- **장중 (Intraday):** 보간 데이터가 실시간으로 재생. 속도 조절 가능 (1x/2x/5x/10x). 일시정지 후 매매
- **일간 (Daily):** 턴 기반. "다음 날로" 버튼으로 넘김. 장 마감 후 포트폴리오 리뷰 시간

## Intraday Price Interpolation

일봉 OHLC 데이터로부터 분 단위 장중 가격을 생성:

1. **Brownian Bridge** — 시가에서 출발, 고가/저가를 경유, 종가에 도착하는 경로를 랜덤 워크로 생성
2. **제약 조건** — 생성 가격은 반드시 고가 이하, 저가 이상 범위 내
3. **거래량 분배** — 일일 거래량을 U자형 패턴(장 시작/마감에 집중)으로 분 단위 배분
4. **리플레이 가치** — 같은 일봉이라도 매번 다른 장중 움직임 생성

## Chart

### TradingView Lightweight Charts

- **캔들스틱 차트** + **거래량 바 차트**
- **시간 단위 전환**: 1분 / 5분 / 15분 / 30분 / 1시간 / 일봉
  - 장중 보간 데이터(분 단위)를 원하는 단위로 aggregate하여 캔들 생성
  - 일봉은 원본 OHLC 데이터 (이미 지나간 날들)

### Technical Indicators (토글 켜기/끄기)

- **이동평균선 (MA)** — 5일, 20일, 60일
- **RSI** — 14일 기준, 차트 하단 서브 패널
- **MACD** — 12/26/9 설정, 차트 하단 서브 패널

### Fundamental Data

- **P/E (Trailing)** — 과거 EPS + 당일 종가로 실시간 계산
- **PBR** — 과거 BPS + 당일 종가로 실시간 계산
- **EPS** — 실적 발표 이벤트에 포함, 분기별 업데이트
- Forward P/E는 과거 컨센서스 데이터 무료 확보 불가로 제외

## Trading

- **시장가 매수/매도만** 지원
- 매매 시 **판단 이유 메모** 입력 가능 (선택사항)
- 한 번에 한 종목만 매매 (멀티 종목은 추후 확장 고려하여 구조 설계)

## Game Modes

### Free Mode (자유 모드)

- 초기 자금 자유 설정
- 기간 제한 없이 자유롭게 매매 연습
- 수익률, 거래 기록 추적

### Challenge Mode (챌린지 모드)

| 챌린지 | 초기자금 | 목표 | 기간 |
|--------|---------|------|------|
| 첫 수익 내기 | 1,000만원 | +1% | 30일 |
| 단기 트레이더 | 500만원 | +10% | 14일 |
| 위기 탈출 | 1,000만원 | 손실 없이 생존 | 60일 (2008년 금융위기 구간) |
| 배당 투자자 | 2,000만원 | 배당 3회 수령 | 365일 |

- 하드코딩으로 시작, 유저 커스텀 챌린지 추가 가능하게 구조 열어둠

## Salary Feature (월급 기능)

- 게임 설정 시 월급 금액과 입금일 설정 (0원이면 비활성)
- 설정한 날에 자동으로 잔고에 추가
- 포트폴리오에서 **총 투입 자금 vs 현재 자산** 적립식 수익률 표시

## Market Events

- **실적 발표** — EPS 데이터 포함, P/E 계산에 사용
- **배당** — 배당일, 배당금
- **금리 결정** — 주요 금리 이벤트
- 이벤트 패널에서 다가오는 이벤트 표시

## UI Theme

- **Pro Dark** — GitHub Dark 스타일 다크 테마
- 배경: `#0d1117` (메인), `#161b22` (패널)
- 보더: `#21262d`, 라운딩 6px
- 액센트: `#1f6feb` (블루 — 버튼, 탭, 활성 상태)
- 상승: `#3fb950`, 하락: `#f85149`
- 텍스트: `#f0f6fc` (주), `#c9d1d9` (보조), `#6e7681` (비활성)

## UI Layout — Classic Trading Layout

```
┌─────────────────────────────────────────────────────────┐
│  종목명 (코드)    현재가 (+변동%)    날짜 | 시간 | 속도  │
├───────────────────────────────┬──────────────────────────┤
│                               │ PORTFOLIO                │
│  [1m 5m 15m 30m 1h 1D]       │  Cash: ___               │
│  [MA | RSI | MACD]           │  Holdings: ___            │
│                               │  P&L: ___                │
│  ┌─────────────────────┐     │  Total Invested: ___      │
│  │                     │     │  P/E: ___ PBR: ___ EPS:___│
│  │  Candlestick Chart  │     │  Next Salary: D-__        │
│  │                     │     ├──────────────────────────  │
│  └─────────────────────┘     │ TRADE                     │
│  ┌─────────────────────┐     │  [BUY] [SELL]             │
│  │  Volume             │     │  Qty: ___                 │
│  └─────────────────────┘     │  Memo: ___                │
│                               ├──────────────────────────│
│                               │ EVENTS                   │
│                               │  Earnings in 3 days      │
│                               │  Dividend ex-date: D-7   │
├───────────────────────────────┴──────────────────────────┤
│  |< Prev   ▶ Play   1x | 2x | 5x | 10x   Next >|      │
└─────────────────────────────────────────────────────────┘
```

- 왼쪽: 차트 영역 (캔들스틱 + 거래량 + 기술 지표 서브패널)
- 오른쪽: 포트폴리오 + 매매 패널 + 이벤트
- 하단: 시간 컨트롤 (재생/일시정지, 속도, 다음 날)

## Data Model

```typescript
interface GameConfig {
  stockSymbol: string;       // '005930.KS', 'AAPL'
  startDate: string;         // '2024-01-02'
  initialCash: number;
  monthlySalary: number;     // 0이면 비활성
  salaryDay: number;         // 1~28
  mode: 'free' | 'challenge';
  challengeId?: string;
}

interface Portfolio {
  cash: number;
  holdings: {
    qty: number;
    avgPrice: number;
  };
  totalInvested: number;     // 초기 자금 + 월급 누적
  trades: Trade[];
}

interface Trade {
  type: 'buy' | 'sell';
  price: number;
  qty: number;
  timestamp: string;         // ISO datetime
  memo: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  initialCash: number;
  targetReturn: number;      // 0.01 = 1%
  maxDays: number;
  stockSymbol?: string;      // 지정 종목 (선택)
  startDate?: string;        // 특정 시작일 (위기 탈출 등)
}

interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketEvent {
  date: string;
  type: 'earnings' | 'dividend' | 'rate_decision';
  description: string;
  data?: {
    eps?: number;
    bps?: number;
    dividendAmount?: number;
  };
}

interface GameState {
  config: GameConfig;
  portfolio: Portfolio;
  currentDate: string;
  currentTime: string;       // 장중 시간
  dayIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  dailyCandles: DailyCandle[];
  events: MarketEvent[];
}
```

## Architecture

```
src/
├── components/
│   ├── StartScreen/          # 게임 설정 화면
│   ├── GameScreen/           # 메인 게임 화면
│   │   ├── ChartPanel/       # 캔들스틱 + 거래량 + 지표
│   │   ├── PortfolioPanel/   # 포트폴리오 + 펀더멘털
│   │   ├── TradePanel/       # 매수/매도 + 메모
│   │   ├── EventPanel/       # 이벤트 피드
│   │   └── TimeControls/     # 재생/속도/턴 컨트롤
│   ├── ResultScreen/         # 결과 분석 화면
│   └── ChallengeList/        # 챌린지 목록
├── engine/
│   ├── interpolation.ts      # Brownian Bridge 장중 가격 보간
│   ├── indicators.ts         # MA, RSI, MACD 계산
│   ├── fundamentals.ts       # P/E, PBR 계산
│   └── aggregator.ts         # 분봉 → 5분/15분/1시간 봉 변환
├── data/
│   ├── yahooFinance.ts       # Yahoo Finance API 호출 (CORS 프록시)
│   └── events.ts             # 이벤트 데이터 fetch/관리
├── state/
│   ├── gameStore.ts          # 게임 상태 관리 (React Context + useReducer)
│   └── storage.ts            # localStorage 읽기/쓰기
├── types/
│   └── index.ts              # TypeScript 타입 정의
└── App.tsx
```

## Multi-Stock Extensibility

현재는 한 종목만 지원하지만, 멀티 종목 확장을 위해:

- `Portfolio.holdings`를 단일 객체 대신 `Map<string, Holding>`으로 변경 가능하도록 설계
- `GameConfig.stockSymbol`을 배열로 확장 가능하도록 고려
- 차트 패널에서 종목 탭 전환 UI 추가 가능한 구조

첫 버전에서는 단일 종목으로 구현하되, 위 확장 포인트를 코드 주석으로 표시.

## Storage

- **localStorage key**: `stock-trading-game-state`
- 게임 진행 상태 전체를 JSON으로 직렬화
- 자동 저장: 매 거래, 매 턴 전환 시
- 복수 세이브 슬롯은 첫 버전에서 미지원 (추후 고려)
