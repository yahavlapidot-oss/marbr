'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Loader2, Users, Trophy, CheckCircle, TrendingUp, Plus, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

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
  const qc = useQueryClient();
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardInventory, setRewardInventory] = useState('1');
  const [drawCount, setDrawCount] = useState('1');

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get(`/campaigns/${id}/analytics`).then((r) => r.data),
  });

  const { data: rewardsData } = useQuery({
    queryKey: ['rewards', id],
    queryFn: () => api.get(`/rewards/campaign/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const addReward = useMutation({
    mutationFn: (payload: any) => api.post(`/rewards/campaign/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', id] });
      setShowAddReward(false);
      setRewardName(''); setRewardDesc(''); setRewardInventory('1');
    },
  });

  const drawWinners = useMutation({
    mutationFn: (count: number) => api.post(`/rewards/campaign/${id}/draw`, { count }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-analytics', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const { campaign, stats } = data ?? {};
  const rewards: any[] = rewardsData ?? [];
  const isRaffle = campaign?.type === 'RAFFLE';

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Users} label="Total Entries" value={stats?.totalEntries ?? 0} />
        <StatTile icon={Trophy} label="Winners" value={stats?.totalWinners ?? 0} />
        <StatTile icon={CheckCircle} label="Redeemed" value={stats?.totalRedemptions ?? 0} />
        <StatTile icon={TrendingUp} label="Conversion" value={`${stats?.conversionRate?.toFixed(1) ?? 0}%`} />
      </div>

      {/* Raffle draw */}
      {isRaffle && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shuffle className="h-4 w-4 text-amber-500" /> Draw Winners</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[#6b6b80] mb-4">
              Randomly select winners from all entries. Each draw is final.
            </p>
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label>Number of winners</Label>
                <Input
                  type="number"
                  min="1"
                  value={drawCount}
                  onChange={(e) => setDrawCount(e.target.value)}
                  className="w-32"
                />
              </div>
              <Button
                onClick={() => drawWinners.mutate(parseInt(drawCount) || 1)}
                disabled={drawWinners.isPending}
              >
                {drawWinners.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Shuffle className="h-4 w-4" />
                }
                Draw Now
              </Button>
            </div>
            {drawWinners.isSuccess && (
              <p className="text-sm text-green-400 mt-3">✓ Winners drawn successfully!</p>
            )}
            {drawWinners.isError && (
              <p className="text-sm text-red-400 mt-3">Failed to draw winners. Try again.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rewards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prizes / Rewards</CardTitle>
          <Button size="sm" onClick={() => setShowAddReward(!showAddReward)}>
            <Plus className="h-4 w-4" />
            Add Prize
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddReward && (
            <div className="rounded-lg border border-[#2a2a38] bg-[#1e1e2e] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Free shots" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={rewardInventory} onChange={(e) => setRewardInventory(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input placeholder="Prize details..." value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addReward.mutate({
                    name: rewardName,
                    description: rewardDesc || undefined,
                    inventory: parseInt(rewardInventory) || 1,
                  })}
                  disabled={!rewardName || addReward.isPending}
                >
                  {addReward.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Prize'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddReward(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {rewards.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-6">No prizes added yet</p>
          ) : (
            <div className="divide-y divide-[#2a2a38]">
              {rewards.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white text-sm">{r.name}</p>
                    {r.description && <p className="text-xs text-[#6b6b80] mt-0.5">{r.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-white">{r.allocated ?? 0} / {r.inventory ?? '∞'}</p>
                    <p className="text-xs text-[#6b6b80]">allocated</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign details */}
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
