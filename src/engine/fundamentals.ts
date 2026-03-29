export function calcPE(price: number, eps: number | null): number | null {
  if (eps === null || eps === 0) return null;
  return Math.round((price / eps) * 100) / 100;
}

export function calcPBR(price: number, bps: number | null): number | null {
  if (bps === null || bps === 0) return null;
  return Math.round((price / bps) * 100) / 100;
}
