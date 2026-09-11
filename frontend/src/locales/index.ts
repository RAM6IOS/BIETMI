import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import fr from './fr.json';

export const NAMESPACES = [
  'common',
  'auth',
  'customers',
  'suppliers',
  'supplierCategories',
  'invoices',
  'quotes',
  'purchaseOrders',
  'users',
  'settings',
  'layout',
  'errors',
] as const;

export const LANGS = ['ar', 'fr'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_STORAGE_KEY = 'bietmi_lang';

export function readLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return stored === 'fr' ? 'fr' : 'ar';
}

export function applyDirection(lang: Lang) {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export function setLanguage(lang: Lang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyDirection(lang);
  void i18n.changeLanguage(lang);
}

const namespaced = (
  source: unknown,
): Record<string, Record<string, unknown>> => {
  const out: Record<string, Record<string, unknown>> = {};
  const bundle = source as Record<string, Record<string, unknown>>;
  for (const ns of NAMESPACES) {
    out[ns] = bundle[ns] ?? {};
  }
  return out;
};

const resources = {
  ar: namespaced(ar),
  fr: namespaced(fr),
};

void i18n.use(initReactI18next).init({
  resources: resources as never,
  lng: readLang(),
  fallbackLng: 'ar',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
