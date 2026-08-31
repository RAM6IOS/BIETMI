import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const MONEY_FIELDS = new Set([
  'subtotal',
  'tvaAmount',
  'totalAmount',
  'lineTotal',
]);

const SCALE_FIELDS = new Set(['quantity', 'unitPrice']);

function formatAmount(value: unknown, scale: number): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const numeric = (value as { toNumber(): number }).toNumber?.();
  if (typeof numeric !== 'number') return value;
  return numeric.toFixed(scale);
}

function serializeLine(line: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(line)) {
    if (SCALE_FIELDS.has(key)) {
      out[key] = formatAmount(line[key], 3);
    } else if (MONEY_FIELDS.has(key)) {
      out[key] = formatAmount(line[key], 2);
    } else {
      out[key] = line[key];
    }
  }
  return out;
}

function serializeInvoice(invoice: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(invoice)) {
    if (MONEY_FIELDS.has(key)) {
      out[key] = formatAmount(invoice[key], 2);
    } else if (key === 'lines') {
      out[key] = (invoice[key] as Array<Record<string, unknown>>).map(
        serializeLine,
      );
    } else {
      out[key] = invoice[key];
    }
  }
  return out;
}

@Injectable()
export class CurrencyInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((payload) => this.serialize(payload)));
  }

  private serialize(payload: unknown): unknown {
    if (payload === null || payload === undefined) return payload;

    if (Array.isArray(payload)) {
      return payload.map((item) => this.serialize(item));
    }

    if (typeof payload === 'object') {
      if ('data' in payload && 'meta' in payload) {
        const { data, meta } = payload as {
          data: Array<Record<string, unknown>>;
          meta: unknown;
        };
        return { data: data.map(serializeInvoice), meta };
      }
      const record = payload as Record<string, unknown>;
      if ('lines' in record || 'status' in record) {
        return serializeInvoice(record);
      }
    }

    return payload;
  }
}
