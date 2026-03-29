import { Challenge } from '../types';

export const challenges: Challenge[] = [
  {
    id: 'first-profit',
    title: '첫 수익 내기',
    description: '30일 안에 1% 이상 수익을 달성하세요.',
    stockSymbol: 'SPY',
    initialCash: 10_000_000,
    targetReturn: 0.01,
    maxDays: 30,
  },
  {
    id: 'short-term-trader',
    title: '단기 트레이더',
    description: '14일 안에 10% 수익을 달성하세요.',
    stockSymbol: 'SPY',
    initialCash: 5_000_000,
    targetReturn: 0.10,
    maxDays: 14,
  },
  {
    id: 'crisis-escape',
    title: '위기 탈출',
    description: '2008년 금융위기 속에서 60일간 손실 없이 생존하세요.',
    stockSymbol: 'SPY',
    initialCash: 10_000_000,
    targetReturn: 0,
    maxDays: 60,
    startDate: '2008-09-01',
  },
  {
    id: 'dividend-investor',
    title: '배당 투자자',
    description: '365일 안에 배당을 3회 수령하세요.',
    stockSymbol: 'SPY',
    initialCash: 20_000_000,
    targetReturn: 0,
    maxDays: 365,
    requiredDividends: 3,
  },
];

export function getChallengeById(id?: string): Challenge | undefined {
  if (!id) return undefined;
  return challenges.find((challenge) => challenge.id === id);
}
