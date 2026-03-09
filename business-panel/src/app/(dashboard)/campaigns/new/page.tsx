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
  type: z.enum(['RAFFLE', 'INSTANT_WIN', 'EVERY_N', 'WEIGHTED_ODDS']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxEntriesPerUser: z.number().int().min(1),
  everyN: z.number().int().min(2).optional(),
  winProbability: z.number().min(0).max(1).optional(),
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
    defaultValues: { type: 'RAFFLE', maxEntriesPerUser: 1 },
  });

  const campaignType = watch('type');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = { ...data };
      if (!payload.startsAt) delete payload.startsAt;
      else payload.startsAt = new Date(payload.startsAt).toISOString();
      if (!payload.endsAt) delete payload.endsAt;
      else payload.endsAt = new Date(payload.endsAt).toISOString();
      await api.post(`/campaigns?businessId=${businessId}`, payload);
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
          <p className="text-[#6b6b80] text-sm">Create a promotion or raffle</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. Happy Hour Raffle" {...register('name')} />
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
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-1.5">
              <Label>Max entries per user</Label>
              <Input type="number" min={1} {...register('maxEntriesPerUser', { valueAsNumber: true })} />
            </div>
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
              <Label>Ends at</Label>
              <Input type="datetime-local" {...register('endsAt')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Push Notification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="🍺 Happy Hour is live!" {...register('pushTitle')} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Input placeholder="Buy a Heineken and enter to win 20 free shots!" {...register('pushBody')} />
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
