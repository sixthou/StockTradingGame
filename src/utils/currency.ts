const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

export function formatSignedUsd(value: number): string {
  if (value > 0) return `+${formatUsd(value)}`;
  if (value < 0) return `-${formatUsd(Math.abs(value))}`;
  return formatUsd(0);
}

export function parseWholeDollarInput(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
