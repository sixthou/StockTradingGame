import { describe, expect, it } from 'vitest';
import { evaluateChallengeProgress } from './challenges';
import type { Challenge } from '../types';

const profitChallenge: Challenge = {
  id: 'first-profit',
  title: '첫 수익 내기',
  description: '30일 안에 1% 이상 수익을 달성하세요.',
  stockSymbol: 'SPY',
  initialCash: 1000,
  targetReturn: 0.01,
  maxDays: 30,
};

const survivalChallenge: Challenge = {
  id: 'crisis-escape',
  title: '위기 탈출',
  description: '2008년 금융위기 속에서 60일간 손실 없이 생존하세요.',
  stockSymbol: 'SPY',
  initialCash: 1000,
  targetReturn: 0,
  maxDays: 60,
};

const dividendChallenge: Challenge = {
  id: 'dividend-investor',
  title: '배당 투자자',
  description: '365일 안에 배당을 3회 수령하세요.',
  stockSymbol: 'SPY',
  initialCash: 1000,
  targetReturn: 0,
  maxDays: 365,
  requiredDividends: 3,
};

describe('evaluateChallengeProgress', () => {
  it('marks a positive target challenge as success when the target return is reached within max days', () => {
    expect(evaluateChallengeProgress(profitChallenge, 12, 0.012)).toEqual({
      status: 'success',
      message: '챌린지 성공: 목표 수익률을 달성했습니다.',
    });
  });

  it('marks a positive target challenge as failure when max days are exhausted without reaching target', () => {
    expect(evaluateChallengeProgress(profitChallenge, 30, 0.005)).toEqual({
      status: 'failure',
      message: '챌린지 실패: 제한 일수 안에 목표 수익률을 달성하지 못했습니다.',
    });
  });

  it('keeps a positive target challenge in progress before the deadline', () => {
    expect(evaluateChallengeProgress(profitChallenge, 10, 0.005)).toEqual({
      status: 'in_progress',
      message: null,
    });
  });

  it('marks a zero-target challenge as success on the last allowed day when return is non-negative', () => {
    expect(evaluateChallengeProgress(survivalChallenge, 60, 0)).toEqual({
      status: 'success',
      message: '챌린지 성공: 제한 일수 동안 조건을 지켰습니다.',
    });
  });

  it('marks a zero-target challenge as failure on the last allowed day when return is negative', () => {
    expect(evaluateChallengeProgress(survivalChallenge, 60, -0.01)).toEqual({
      status: 'failure',
      message: '챌린지 실패: 제한 일수 종료 시점에 손실 상태입니다.',
    });
  });

  it('marks a dividend challenge as success when the required dividend count is reached', () => {
    expect(evaluateChallengeProgress(dividendChallenge, 120, 0, 3)).toEqual({
      status: 'success',
      message: '챌린지 성공: 목표 배당 횟수를 달성했습니다.',
    });
  });

  it('marks a dividend challenge as failure when max days end before enough dividends are received', () => {
    expect(evaluateChallengeProgress(dividendChallenge, 365, 0, 2)).toEqual({
      status: 'failure',
      message: '챌린지 실패: 제한 일수 안에 목표 배당 횟수를 채우지 못했습니다.',
    });
  });
});
