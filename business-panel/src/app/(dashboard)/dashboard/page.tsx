'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone, Users, TrendingUp, Plus, CheckCircle, BarChart2, Trophy, DollarSign, ShoppingBag, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { formatDateTime } from '@/lib/utils';

const COLOR_MAP = {
  amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  value: 'text-amber-400'  },
  green:  { bg: 'bg-green-500/10',  icon: 'text-green-400',  value: 'text-green-400'  },
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   value: 'text-blue-400'   },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', value: 'text-purple-400' },
  rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   value: 'text-rose-400'   },
};

function StatCard({ title, value, icon: Icon, sub, color = 'amber', highlight = false }: {
  title: string; value: string | number; icon: React.ElementType; sub?: string;
  color?: keyof typeof COLOR_MAP; highlight?: boolean;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className={highlight ? 'ring-1 ring-amber-500/40' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-[#6b6b80] uppercase tracking-wide leading-tight">{title}</span>
          <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0 ml-2`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
        </div>
        <div className={`text-3xl font-bold mb-1 ${c.value}`}>{value}</div>
        {sub && <p className="text-xs text-[#6b6b80]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT: Record<string, 'active' | 'paused' | 'ended' | 'draft' | 'scheduled'> = {
  ACTIVE: 'active', PAUSED: 'paused', ENDED: 'ended', DRAFT: 'draft', SCHEDULED: 'scheduled',
};

export default function DashboardPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/campaigns`).then((r) => r.data),
    enabled: !!businessId,
    refetchInterval: 30_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics-dashboard', businessId],
    queryFn: () => api.get(`/analytics/business/${businessId}/dashboard`).then((r) => r.data),
    enabled: !!businessId,
    refetchInterval: 30_000,
  });

  const active = campaigns?.filter((c: any) => c.status === 'ACTIVE') ?? [];
  const totals = analytics?.totals;
  const totalEntries: number = totals?.entries ?? campaigns?.reduce((sum: number, c: any) => sum + (c._count?.entries ?? 0), 0) ?? 0;
  const totalWinners: number = totals?.winners ?? 0;
  const totalRedemptions: number = totals?.redemptions ?? 0;
  const conversionRate: number = totals?.conversionRate ?? 0;
  const redemptionRate: number = totals?.redemptionRate ?? 0;
  const revenue: number = totals?.revenue ?? 0;
  const rewardCost: number = totals?.rewardCost ?? 0;
  const netProfit: number = totals?.netProfit ?? 0;
  const roi: number | null = totals?.roi ?? null;

  const fmt = (n: number) => `₪${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-20" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#2a2a38] p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('dashboard_subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            {t('dashboard_new_campaign')}
          </Link>
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('dashboard_active_campaigns')}
          value={active.length}
          icon={Megaphone}
          color={active.length > 0 ? 'green' : 'amber'}
          highlight={active.length > 0}
          sub={active.length > 0 ? `${campaigns?.length ?? 0} ${t('dashboard_total_campaigns')}` : t('dashboard_no_active')}
        />
        <StatCard
          title={t('analytics_kpi_entries')}
          value={totalEntries.toLocaleString()}
          icon={Users}
          color="amber"
          sub={active.length > 0 ? `${active.reduce((s: number, c: any) => s + (c._count?.entries ?? 0), 0).toLocaleString()} ${t('dashboard_in_active')}` : undefined}
        />
        <StatCard
          title={t('analytics_kpi_winners')}
          value={totalWinners.toLocaleString()}
          icon={Trophy}
          color="purple"
          sub={totalEntries > 0 ? `${conversionRate.toFixed(1)}% ${t('analytics_kpi_conversion').toLowerCase()}` : undefined}
        />
        <StatCard
          title={t('analytics_kpi_redemptions')}
          value={totalRedemptions.toLocaleString()}
          icon={CheckCircle}
          color="blue"
          sub={totalWinners > 0 ? `${redemptionRate.toFixed(1)}% ${t('analytics_kpi_redemption_rate').toLowerCase()}` : undefined}
        />
        <StatCard
          title={t('analytics_kpi_conversion')}
          value={totalEntries > 0 ? `${conversionRate.toFixed(1)}%` : '—'}
          icon={TrendingUp}
          color="amber"
          sub={t('dashboard_conversion_sub')}
        />
        <StatCard
          title={t('analytics_kpi_redemption_rate')}
          value={totalWinners > 0 ? `${redemptionRate.toFixed(1)}%` : '—'}
          icon={BarChart2}
          color="rose"
          sub={t('dashboard_redemption_sub')}
        />
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-[#6b6b80] uppercase tracking-wide mb-3">{t('dashboard_financials')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={t('fin_revenue_total')}
            value={fmt(revenue)}
            icon={DollarSign}
            color="green"
            sub={t('dashboard_revenue_sub')}
          />
          <StatCard
            title={t('fin_reward_cost_total')}
            value={fmt(rewardCost)}
            icon={ShoppingBag}
            color="rose"
            sub={t('dashboard_reward_cost_sub')}
          />
          <StatCard
            title={t('fin_profit_total')}
            value={fmt(netProfit)}
            icon={Wallet}
            color={netProfit >= 0 ? 'green' : 'rose'}
            highlight={netProfit > 0}
            sub={roi != null ? `ROI ${roi.toFixed(0)}%` : undefined}
          />
        </div>
      </div>

      {/* Active campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboard_active_campaigns')}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/campaigns">{t('dashboard_view_all')}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-8">{t('dashboard_no_active')}</p>
          ) : (
            <div className="space-y-3">
              {active.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-[#2a2a38] p-4 hover:bg-[#1e1e2e] transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-xs text-[#6b6b80] mt-1">
                      {c.endsAt ? `${t('dashboard_ends')} ${formatDateTime(c.endsAt)}` : t('dashboard_no_end')}
                      {' · '}
                      {c._count?.entries ?? 0} entries
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>{c.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
