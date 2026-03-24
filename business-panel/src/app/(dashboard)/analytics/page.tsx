'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/campaigns`).then((r) => r.data),
    enabled: !!businessId,
  });

  const chartData = campaigns?.map((c: any) => ({
    name: c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name,
    Entries: c._count?.entries ?? 0,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('analytics_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('analytics_subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('analytics_entries_by_campaign')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-2">
              <div className="flex items-end gap-3 h-56">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${40 + Math.random() * 60}%` }} />
                ))}
              </div>
              <div className="flex justify-center gap-6 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-12">{t('analytics_no_data')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="name" tick={{ fill: '#6b6b80', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b6b80', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f1f3' }}
                />
                <Bar dataKey="Entries" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
