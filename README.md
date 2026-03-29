# Stock Trading Game

과거 일봉 데이터를 기준으로 플레이하는 주식 매매 연습 게임입니다.  
차트는 일봉 기준으로 진행되고, 시작일 이전 3년 히스토리를 먼저 보여준 뒤 하루씩 다음 캔들을 공개합니다.

## 특징

- 일봉 기반 플레이
- 시작일 이전 3년 히스토리 표시
- `RSI`, `MACD`, 이동평균선(`5, 10, 20, 50, 100, 200`)
- 자유 모드 / 챌린지 모드
- `Twelve Data API Key`를 사용자 입력으로 받는 완전 정적 호스팅 구조

## 기술 스택

- React
- TypeScript
- Vite
- Zustand
- lightweight-charts
- Vitest

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 브라우저 접속

기본 주소:

```text
http://localhost:5173/
```

포트가 이미 사용 중이면 Vite가 다른 포트로 자동 실행됩니다.

## API Key

이 앱은 서버 프록시 없이 브라우저에서 `Twelve Data`를 직접 호출합니다.  
그래서 시작 화면에서 사용자가 자신의 API 키를 직접 입력해야 합니다.

- 발급 링크: https://twelvedata.com/apikey
- 키가 없으면 종목 검색과 정상적인 플레이가 불가능합니다.
- 개발자 서버에 비밀 키를 저장하지 않습니다.

## 지원 범위

- 현재는 미국 종목만 지원합니다.
- 챌린지 모드는 `SPY` 기준으로 동작합니다.

## 테스트

```bash
npm run test
```

특정 테스트만 실행:

```bash
npx vitest run src/components/GameScreen.test.tsx
```

## 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## GitHub Pages 배포

이 프로젝트는 `GitHub Pages` 배포용 워크플로우를 포함합니다.

필요 조건:

- 저장소 `Settings > Pages`
- `Source`를 `GitHub Actions`로 설정

그 뒤 `main` 브랜치에 푸시하면 자동으로 빌드와 배포가 실행됩니다.

예상 배포 주소:

```text
https://sixthou.github.io/StockTradingGame/
```

## 주의사항

- 외부 데이터 품질과 호출 제한은 `Twelve Data` 상태에 영향을 받습니다.
- 이벤트 데이터가 실패해도 게임은 시작되지만, 이벤트 패널은 비어 있을 수 있습니다.
