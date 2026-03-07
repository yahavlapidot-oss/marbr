'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users, Trophy, CheckCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDateTime, pct } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: 'active', PAUSED: 'paused', ENDED: 'ended', DRAFT: 'draft', SCHEDULED: 'scheduled',
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

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get(`/campaigns/${id}/analytics`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const { campaign, stats } = data ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign?.name}</h1>
            <Badge variant={STATUS_VARIANT[campaign?.status]}>{campaign?.status}</Badge>
          </div>
          <p className="text-[#6b6b80] text-sm mt-1">
            {campaign?.type?.replace('_', ' ')}
            {campaign?.startsAt && ` · Starts ${formatDateTime(campaign.startsAt)}`}
            {campaign?.endsAt && ` · Ends ${formatDateTime(campaign.endsAt)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Users} label="Total Entries" value={stats?.totalEntries ?? 0} />
        <StatTile icon={Trophy} label="Winners" value={stats?.totalWinners ?? 0} />
        <StatTile icon={CheckCircle} label="Redeemed" value={stats?.totalRedemptions ?? 0} />
        <StatTile icon={TrendingUp} label="Conversion" value={`${stats?.conversionRate?.toFixed(1) ?? 0}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {campaign?.pushTitle && (
            <div>
              <p className="text-xs text-[#6b6b80] mb-1">Push Notification</p>
              <div className="rounded-lg bg-[#1e1e2e] border border-[#2a2a38] p-3">
                <p className="font-medium text-white text-sm">{campaign.pushTitle}</p>
                {campaign.pushBody && <p className="text-[#a1a1b5] text-sm mt-1">{campaign.pushBody}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#6b6b80]">Max entries / user</p>
              <p className="text-white">{campaign?.maxEntriesPerUser ?? 1}</p>
            </div>
            {campaign?.everyN && (
              <div>
                <p className="text-[#6b6b80]">Every N</p>
                <p className="text-white">{campaign.everyN}</p>
              </div>
            )}
            {campaign?.winProbability && (
              <div>
                <p className="text-[#6b6b80]">Win probability</p>
                <p className="text-white">{(campaign.winProbability * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
