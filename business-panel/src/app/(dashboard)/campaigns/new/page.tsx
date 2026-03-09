'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['RAFFLE', 'INSTANT_WIN', 'EVERY_N', 'WEIGHTED_ODDS', 'SNAKE']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxEntriesPerUser: z.number().int().min(1),
  everyN: z.number().int().min(2).optional(),
  winProbability: z.number().min(0).max(1).optional(),
  topN: z.number().int().min(1).optional(),
  rewardName: z.string().optional(),
  pushTitle: z.string().optional(),
  pushBody: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const businessId = useAuthStore((s) => s.businessId);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'RAFFLE', maxEntriesPerUser: 1, topN: 3, rewardName: 'Winner Prize' },
  });

  const campaignType = watch('type');
  const isSnake = campaignType === 'SNAKE';

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = { ...data };
      if (!payload.startsAt) delete payload.startsAt;
      else payload.startsAt = new Date(payload.startsAt).toISOString();
      if (!payload.endsAt) delete payload.endsAt;
      else payload.endsAt = new Date(payload.endsAt).toISOString();

      const topN = payload.topN;
      const rewardName = payload.rewardName;
      delete payload.topN;
      delete payload.rewardName;

      if (isSnake) {
        payload.maxEntriesPerUser = 1; // enforced for snake
      }

      const res = await api.post(`/campaigns?businessId=${businessId}`, payload);
      const campaignId = res.data.id;

      // For SNAKE: auto-create reward with inventory = topN
      if (isSnake && campaignId) {
        await api.post(`/rewards/campaign/${campaignId}`, {
          name: rewardName || 'Winner Prize',
          inventory: topN ?? 3,
        });
      }

      router.push('/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create campaign');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Campaign</h1>
          <p className="text-[#6b6b80] text-sm">Create a promotion or game</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. Happy Hour Snake" {...register('name')} />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Campaign Type *</Label>
              <Select
                value={campaignType}
                onValueChange={(v) => setValue('type', v as FormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAFFLE">Raffle (random winner at end)</SelectItem>
                  <SelectItem value="INSTANT_WIN">Instant Win</SelectItem>
                  <SelectItem value="EVERY_N">Every N Entries Wins</SelectItem>
                  <SelectItem value="WEIGHTED_ODDS">Weighted Odds</SelectItem>
                  <SelectItem value="SNAKE">🐍 Snake Leaderboard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isSnake && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
                <p className="text-amber-400 text-sm font-medium">🐍 Snake Game Campaign</p>
                <p className="text-[#6b6b80] text-xs">
                  Customers play Snake on their phone. One game per player. Top scorers win when the campaign ends.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Number of winners</Label>
                    <Input type="number" min={1} placeholder="3" {...register('topN', { valueAsNumber: true })} />
                    <p className="text-[#6b6b80] text-xs">Top N scores win the reward</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reward name</Label>
                    <Input placeholder="Free drinks" {...register('rewardName')} />
                  </div>
                </div>
              </div>
            )}

            {campaignType === 'EVERY_N' && (
              <div className="space-y-1.5">
                <Label>Win every N entries</Label>
                <Input type="number" min={2} placeholder="e.g. 10" {...register('everyN', { valueAsNumber: true })} />
              </div>
            )}

            {campaignType === 'WEIGHTED_ODDS' && (
              <div className="space-y-1.5">
                <Label>Win probability (0–1)</Label>
                <Input type="number" step="0.01" min={0} max={1} placeholder="e.g. 0.1" {...register('winProbability', { valueAsNumber: true })} />
              </div>
            )}

            {!isSnake && (
              <div className="space-y-1.5">
                <Label>Max entries per user</Label>
                <Input type="number" min={1} {...register('maxEntriesPerUser', { valueAsNumber: true })} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Starts at</Label>
              <Input type="datetime-local" {...register('startsAt')} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends at {isSnake && <span className="text-amber-400">(required for Snake)</span>}</Label>
              <Input type="datetime-local" {...register('endsAt')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Push Notification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder={isSnake ? '🐍 Snake challenge is live!' : '🍺 Happy Hour is live!'} {...register('pushTitle')} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Input placeholder={isSnake ? 'Play Snake and top the leaderboard to win!' : 'Buy a Heineken and enter to win!'} {...register('pushBody')} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/campaigns">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
