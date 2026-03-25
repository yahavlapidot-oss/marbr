'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Trophy, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { formatDateTime } from '@/lib/utils';
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: 'active', PAUSED: 'paused', ENDED: 'ended',
  DRAFT: 'draft', SCHEDULED: 'scheduled', CANCELLED: 'destructive',
};

const TYPE_LABEL: Record<string, string> = {
  RAFFLE: 'Raffle', INSTANT_WIN: 'Instant', EVERY_N: 'Every N',
  WEIGHTED_ODDS: 'Weighted', SNAKE: 'Snake',
};

const REWARD_STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#22c55e', REDEEMED: '#6b6b80', EXPIRED: '#ef4444', REVOKED: '#f97316',
};

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#2a2a38] bg-[#1a1a24] p-4">
      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-amber-500" />
      </div>
      <div>
        <p className="text-xs text-[#6b6b80]">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

type SortCol = 'entries' | 'winners' | 'conversionRate' | 'name';

export default function AnalyticsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'entries', dir: 'desc' });

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', businessId],
    queryFn: () => api.get(`/analytics/business/${businessId}/dashboard`).then((r) => r.data),
    enabled: !!businessId,
  });

  const METHOD_LABEL: Record<string, string> = {
    QR_SCAN: t('analytics_method_qr'),
    MANUAL_CODE: t('analytics_method_code'),
    CHECKIN: t('analytics_method_checkin'),
    POS_CALLBACK: t('analytics_method_pos'),
  };

  const sortedCampaigns = [...(data?.campaignStats ?? [])].sort((a: any, b: any) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.col === 'name') return dir * a.name.localeCompare(b.name);
    return dir * ((a[sort.col] ?? 0) - (b[sort.col] ?? 0));
  });

  const methodChartData = (data?.methodBreakdown ?? []).map((m: any) => ({
    name: METHOD_LABEL[m.method] ?? m.method,
    count: m.count,
  }));

  const rewardChartData = (data?.rewardStatusBreakdown ?? []).map((r: any) => ({
    name: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
    count: r.count,
    fill: REWARD_STATUS_COLOR[r.status] ?? '#6b6b80',
  }));

  const handleSort = (col: SortCol) => {
    setSort((s) => s.col === col ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
  };

  const SortArrow = ({ col }: { col: SortCol }) =>
    sort.col === col ? <span className="ml-1 text-amber-500">{sort.dir === 'desc' ? '↓' : '↑'}</span> : null;

  const emptyState = <p className="text-center text-[#6b6b80] py-10 text-sm">{t('analytics_no_data')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('analytics_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('analytics_subtitle')}</p>
      </div>

      {/* KPI row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={Users} label={t('analytics_kpi_entries')} value={data?.totals?.entries ?? 0} />
          <StatTile icon={Trophy} label={t('analytics_kpi_winners')} value={data?.totals?.winners ?? 0} />
          <StatTile icon={CheckCircle} label={t('analytics_kpi_redemptions')} value={data?.totals?.redemptions ?? 0} />
          <StatTile icon={TrendingUp} label={t('analytics_kpi_conversion')} value={`${(data?.totals?.conversionRate ?? 0).toFixed(1)}%`} />
        </div>
      )}

      {/* Entries over time */}
      <Card>
        <CardHeader><CardTitle>{t('analytics_entries_over_time')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : !data?.entriesByDay?.length ? (
            emptyState
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.entriesByDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f1f3' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2}
                  fill="url(#goldGrad)" dot={false} name={t('analytics_col_entries')} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Campaign performance table */}
      <Card>
        <CardHeader><CardTitle>{t('analytics_campaign_perf')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : !sortedCampaigns.length ? (
            emptyState
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a38] text-[#6b6b80]">
                    <th className="text-start pb-3 font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort('name')}>
                      {t('analytics_col_campaign')}<SortArrow col="name" />
                    </th>
                    <th className="text-start pb-3 font-medium">{t('analytics_col_type')}</th>
                    <th className="text-end pb-3 font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort('entries')}>
                      {t('analytics_col_entries')}<SortArrow col="entries" />
                    </th>
                    <th className="text-end pb-3 font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort('winners')}>
                      {t('analytics_col_winners')}<SortArrow col="winners" />
                    </th>
                    <th className="text-end pb-3 font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort('conversionRate')}>
                      {t('analytics_col_conversion')}<SortArrow col="conversionRate" />
                    </th>
                    <th className="text-end pb-3 font-medium">{t('analytics_col_ends')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a38]">
                  {sortedCampaigns.map((c: any) => (
                    <tr key={c.id} className="hover:bg-[#1e1e2e] transition-colors">
                      <td className="py-3 max-w-[200px]">
                        <div className="font-medium text-white truncate">{c.name}</div>
                        <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'} className="mt-1 text-[10px]">{c.status}</Badge>
                      </td>
                      <td className="py-3 text-[#6b6b80]">{TYPE_LABEL[c.type] ?? c.type}</td>
                      <td className="py-3 text-end text-white">{c._count?.entries ?? 0}</td>
                      <td className="py-3 text-end text-white">{c.winners}</td>
                      <td className="py-3 text-end text-amber-400 font-medium">{c.conversionRate.toFixed(1)}%</td>
                      <td className="py-3 text-end text-[#6b6b80] text-xs">
                        {c.endsAt ? formatDateTime(c.endsAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: entry methods + reward breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('analytics_entry_methods')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : !methodChartData.length ? (
              emptyState
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, methodChartData.length * 48)}>
                <BarChart data={methodChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b6b80', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6b6b80', fontSize: 12 }} width={96} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 8 }}
                    labelStyle={{ color: '#f1f1f3' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name={t('analytics_col_entries')} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('analytics_reward_breakdown')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : !rewardChartData.length ? (
              emptyState
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, rewardChartData.length * 48)}>
                <BarChart data={rewardChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b6b80', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6b6b80', fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 8 }}
                    labelStyle={{ color: '#f1f1f3' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} name={t('analytics_kpi_winners')}>
                    {rewardChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
