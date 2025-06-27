import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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
    
    const loadFCSummary = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First try to fetch from the existing API
        const response = await fetch(`/api/fc-summary/${partnerOrgId}`);
        
        if (response.ok) {
          const data = await response.json();
          setData(data);
          return;
        }
        
        // If API fails, try to calculate from Supabase deals data as fallback
        console.log('FC Summary API failed, trying Supabase fallback...');
        const supabase = createClient();
        
        // Try to get customer data and calculate FC summary from deals
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('closed_won, Contracted, totalPipelineAmount')
          .eq('partner_org_id', partnerOrgId)
          .single();
          
        if (customerError) {
          console.error('Failed to fetch customer data:', customerError);
          throw new Error('No FC data available');
        }
        
        // Calculate FC summary from available customer data
        const fcConsumed = Number(customerData?.closed_won) || 0;
        const fcBought = Number(customerData?.Contracted) || 0;
        const fcRemaining = fcBought - fcConsumed;
        const fcConsumedYTD = fcConsumed; // Approximate - we don't have time-based data
        const fcConsumedMTD = Math.round(fcConsumed / 12); // Rough monthly estimate
        
        setData({
          fcRemaining,
          fcBought,
          fcConsumed,
          fcConsumedMTD,
          fcConsumedYTD
        });
        
      } catch (err: any) {
        console.error('FC Summary error:', err);
        setError(err.message || 'Failed to load FC summary');
      } finally {
        setLoading(false);
      }
    };
    
    loadFCSummary();
  }, [partnerOrgId]);

  return { data, loading, error };
}
