import type { Challenge } from '../types';

export interface ChallengeProgress {
  status: 'in_progress' | 'success' | 'failure';
  message: string | null;
}

export function evaluateChallengeProgress(
  challenge: Challenge,
  elapsedDays: number,
  totalReturn: number,
  dividendReceiptCount = 0,
): ChallengeProgress {
  if (challenge.requiredDividends && challenge.requiredDividends > 0) {
    if (dividendReceiptCount >= challenge.requiredDividends) {
      return {
        status: 'success',
        message: '챌린지 성공: 목표 배당 횟수를 달성했습니다.',
      };
    }

    if (elapsedDays >= challenge.maxDays) {
      return {
        status: 'failure',
        message: '챌린지 실패: 제한 일수 안에 목표 배당 횟수를 채우지 못했습니다.',
      };
    }

    return { status: 'in_progress', message: null };
  }

  if (challenge.targetReturn > 0) {
    if (totalReturn >= challenge.targetReturn) {
      return {
        status: 'success',
        message: '챌린지 성공: 목표 수익률을 달성했습니다.',
      };
    }

    if (elapsedDays >= challenge.maxDays) {
      return {
        status: 'failure',
        message: '챌린지 실패: 제한 일수 안에 목표 수익률을 달성하지 못했습니다.',
      };
    }

    return { status: 'in_progress', message: null };
  }

  if (elapsedDays >= challenge.maxDays) {
    if (totalReturn >= 0) {
      return {
        status: 'success',
        message: '챌린지 성공: 제한 일수 동안 조건을 지켰습니다.',
      };
    }

    return {
      status: 'failure',
      message: '챌린지 실패: 제한 일수 종료 시점에 손실 상태입니다.',
    };
  }

  return { status: 'in_progress', message: null };
}
