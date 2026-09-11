import { Prisma } from '@prisma/client';
import type { PaymentMethodDto } from './dto/payment-method.dto';
import { round2 } from './money';

/**
 * Normalizes an incoming payment-methods array for persistence:
 * - trims labels, rounds percentages to 2 decimals,
 * - drops entries with an empty label,
 * - returns `null` for empty/undefined input (JSON column nullable).
 */
export function normalizePaymentMethods(
  methods?: PaymentMethodDto[] | null,
): Prisma.InputJsonValue | null {
  if (!methods || !Array.isArray(methods)) {
    return null;
  }

  const normalized: { label: string; percentage: number }[] = [];

  for (const method of methods) {
    const label = method?.label?.trim() ?? '';
    if (!label) continue;
    const percentage = Number(method?.percentage);
    if (!Number.isFinite(percentage)) continue;
    normalized.push({
      label,
      percentage: round2(new Prisma.Decimal(String(percentage))).toNumber(),
    });
  }

  return normalized.length > 0 ? normalized : null;
}
