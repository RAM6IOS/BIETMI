import { Prisma } from '@prisma/client';
import { computeTotals } from './money';

describe('computeTotals', () => {
  it('should compute totals without discount by default', () => {
    const result = computeTotals([
      { description: 'Item A', quantity: 2, unitPrice: 100 },
      { description: 'Item B', quantity: 1, unitPrice: 50 },
    ]);

    expect(result.subtotal).toEqual(new Prisma.Decimal('250'));
    expect(result.discountAmount).toEqual(new Prisma.Decimal('0'));
    expect(result.amountAfterDiscount).toEqual(new Prisma.Decimal('250'));
    expect(result.tvaAmount).toEqual(new Prisma.Decimal('47.5'));
    expect(result.totalAmount).toEqual(new Prisma.Decimal('297.5'));
  });

  it('should apply discount before TVA: subtotal - discount -> TVA on the remainder', () => {
    // subtotal 1000, discount 10% -> discount 100, after 900,
    // TVA 19% x 900 = 171, TTC = 900 + 171 = 1071
    const result = computeTotals(
      [{ description: 'Item A', quantity: 2, unitPrice: 500 }],
      10,
    );

    expect(result.subtotal).toEqual(new Prisma.Decimal('1000'));
    expect(result.discountAmount).toEqual(new Prisma.Decimal('100'));
    expect(result.amountAfterDiscount).toEqual(new Prisma.Decimal('900'));
    expect(result.tvaAmount).toEqual(new Prisma.Decimal('171'));
    expect(result.totalAmount).toEqual(new Prisma.Decimal('1071'));
  });

  it('should round the discount amount before applying TVA', () => {
    // Line-item rounding: subtotal = 35.61 (see invoice service spec).
    // discount 5% -> round2(35.61 x 0.05) = 1.78
    // after = 33.83, TVA = round2(33.83 x 0.19) = 6.43, TTC = 33.83 + 6.43 = 40.26
    const result = computeTotals(
      [
        { description: 'Line A', quantity: 7, unitPrice: 3.335 },
        { description: 'Line B', quantity: 3, unitPrice: 2.225 },
        { description: 'Line C', quantity: 5, unitPrice: 1.115 },
      ],
      5,
    );

    expect(result.subtotal).toEqual(new Prisma.Decimal('35.61'));
    expect(result.discountAmount).toEqual(new Prisma.Decimal('1.78'));
    expect(result.amountAfterDiscount).toEqual(new Prisma.Decimal('33.83'));
    expect(result.tvaAmount).toEqual(new Prisma.Decimal('6.43'));
    expect(result.totalAmount).toEqual(new Prisma.Decimal('40.26'));
  });
});
