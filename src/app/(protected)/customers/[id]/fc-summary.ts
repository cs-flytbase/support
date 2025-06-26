import { useEffect, useState } from 'react';

export interface FCSummary {
  fcRemaining: number;
  fcBought: number;
  fcConsumed: number;
  fcConsumedMTD: number;
  fcConsumedYTD: number;
}

export function useFCSummary(partnerOrgId: string | undefined | null) {
  const [data, setData] = useState<FCSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerOrgId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/fc-summary/${partnerOrgId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch FC summary');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [partnerOrgId]);

  return { data, loading, error };
}
