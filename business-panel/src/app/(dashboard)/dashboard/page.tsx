'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone, Users, Gift, TrendingUp, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime } from '@/lib/utils';

function StatCard({ title, value, icon: Icon, sub }: {
  title: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[#6b6b80]">{title}</span>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
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

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/campaigns`).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', businessId],
    queryFn: () => api.get(`/analytics/business/${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const active = campaigns?.filter((c: any) => c.status === 'ACTIVE') ?? [];
  const totalEntries = analytics?.totalEntries ?? campaigns?.reduce((sum: number, c: any) => sum + (c._count?.entries ?? 0), 0) ?? 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#6b6b80] text-sm mt-1">Real-time overview of your venue</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Campaigns" value={active.length} icon={Megaphone} />
        <StatCard title="Total Entries" value={totalEntries} icon={Users} />
        <StatCard title="Rewards Issued" value={analytics?.totalWinners ?? '—'} icon={Gift} />
        <StatCard
          title="Conversion Rate"
          value={analytics?.conversionRate != null ? `${analytics.conversionRate.toFixed(1)}%` : '—'}
          icon={TrendingUp}
        />
      </div>

      {/* Active campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Campaigns</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/campaigns">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-8">No active campaigns</p>
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
                      {c.endsAt ? `Ends ${formatDateTime(c.endsAt)}` : 'No end time'}
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
