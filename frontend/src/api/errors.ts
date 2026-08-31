import i18n from '../locales';
import { ApiError } from './http';

export function translateApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errorCode && i18n.exists(`errors:${err.errorCode}`)) {
      return i18n.t(`errors:${err.errorCode}`);
    }
    return err.message;
  }
  const msg = (err as { message?: unknown })?.message;
  return typeof msg === 'string' ? msg : String(err ?? '');
}
