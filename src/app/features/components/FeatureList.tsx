'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Feature = {
  id: string;
  feature_name: string;
  category?: string;
};

export default function FeatureList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const selectedId = pathname.split('/').pop();

  useEffect(() => {
    async function fetchFeatures() {
      setLoading(true);
      const { data } = await supabase
        .from('features')
        .select('id,feature_name,category')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });
      setFeatures(data || []);
      setLoading(false);
    }
    fetchFeatures();
  }, []);

  // Group by category
  const grouped = features.reduce<Record<string, Feature[]>>((acc, feature) => {
    const cat = feature.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {});

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <aside className="w-80 border-r h-full overflow-y-auto bg-white">
      <h2 className="p-4 text-xl font-bold">Features</h2>
      <div>
        {Object.entries(grouped).map(([category, feats]) => (
          <div key={category}>
            <div className="sticky top-0 z-10 bg-white px-4 py-2 font-semibold text-gray-700 border-b">
              {category}
            </div>
            <ul>
              {feats.map((feature) => (
                <li key={feature.id}>
                  <Link
                    href={`/features/${feature.id}`}
                    className={`block px-6 py-3 border-b hover:bg-blue-50 transition ${
                      selectedId === feature.id ? 'bg-blue-100 font-bold text-blue-700' : ''
                    }`}
                  >
                    {feature.feature_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
} 