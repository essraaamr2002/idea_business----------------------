export const PLATFORM_COMMISSION_RATE = 0.07;
export const VAT_RATE = 0.15;

export function calculateInvestmentFees(subtotal: number) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  const platformCommission = safeSubtotal * PLATFORM_COMMISSION_RATE;
  const vatOnCommission = platformCommission * VAT_RATE;
  return {
    subtotal: safeSubtotal,
    platformCommission,
    vatOnCommission,
    total: safeSubtotal + platformCommission + vatOnCommission,
  };
}
