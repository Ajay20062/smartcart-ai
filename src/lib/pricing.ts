export function calculatePrice(
  request: string,
  content: string,
  basePriceCents = 900,
): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const requestLength = request.trim().length;
  const lengthFee = Math.max(0, words - 150) * 2;
  const complexityFee =
    requestLength > 500 ? 300 : requestLength > 200 ? 150 : 0;
  const total = basePriceCents + lengthFee + complexityFee;

  return Math.min(100_000, Math.max(100, Math.round(total)));
}

export function formatMoney(
  cents: number,
  currency = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
