import { Prisma } from '@prisma/client';

export const TVA_RATE = new Prisma.Decimal('0.19');

export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function computeTotals(
  lines: {
    description: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
  }[],
) {
  const computed = lines.map((line) => {
    const qty = new Prisma.Decimal(String(line.quantity));
    const price = new Prisma.Decimal(String(line.unitPrice));
    const lineTotal = round2(qty.mul(price));
    return { ...line, lineTotal };
  });

  let subtotal = new Prisma.Decimal(0);
  for (const line of computed) {
    subtotal = subtotal.plus(line.lineTotal);
  }
  subtotal = round2(subtotal);

  const tvaAmount = round2(subtotal.mul(TVA_RATE));
  const totalAmount = round2(subtotal.plus(tvaAmount));

  return { computed, subtotal, tvaAmount, totalAmount };
}
