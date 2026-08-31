import { useEffect, useState } from 'react';
import { getCompany } from '../api/company';
import type { Company } from '../api/company';

let cached: Company | null = null;
let inflight: Promise<Company> | null = null;

function loadCompany(): Promise<Company> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = getCompany()
      .then((data) => {
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadCompany()
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'تعذر تحميل معلومات الشركة',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => {
    cached = null;
    inflight = null;
    setCompany(null);
    setLoading(true);
    setError('');
    loadCompany()
      .then(setCompany)
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'تعذر تحميل معلومات الشركة',
        );
      })
      .finally(() => setLoading(false));
  };

  return { company, loading, error, refresh };
}