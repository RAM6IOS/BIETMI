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
  discountPercent = 0,
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

  const discountAmount = round2(
    subtotal.mul(new Prisma.Decimal(String(discountPercent))).div(100),
  );
  const amountAfterDiscount = subtotal.minus(discountAmount);

  const tvaAmount = round2(amountAfterDiscount.mul(TVA_RATE));
  const totalAmount = round2(amountAfterDiscount.plus(tvaAmount));

  return {
    computed,
    subtotal,
    discountAmount,
    amountAfterDiscount,
    tvaAmount,
    totalAmount,
  };
}
