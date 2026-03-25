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
import { useLocaleStore } from '@/lib/locale-store';

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
  const t = useLocaleStore((s) => s.t);
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
          <h1 className="text-2xl font-bold text-white">{t('campaign_new_title')}</h1>
          <p className="text-[#6b6b80] text-sm">{t('campaign_new_sub')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{t('campaign_basic_info')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('campaign_name')} *</Label>
              <Input placeholder={t('campaign_name_ph')} {...register('name')} />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t('campaign_type')} *</Label>
              <Select
                value={campaignType}
                onValueChange={(v) => setValue('type', v as FormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('campaign_type_select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAFFLE">{t('campaigns_type_raffle')}</SelectItem>
                  <SelectItem value="INSTANT_WIN">{t('campaigns_type_instant')}</SelectItem>
                  <SelectItem value="EVERY_N">{t('campaigns_type_every_n')}</SelectItem>
                  <SelectItem value="WEIGHTED_ODDS">{t('campaigns_type_weighted')}</SelectItem>
                  <SelectItem value="SNAKE">🐍 {t('campaigns_type_snake')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isSnake && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
                <p className="text-amber-400 text-sm font-medium">🐍 {t('campaign_snake_section')}</p>
                <p className="text-[#6b6b80] text-xs">
                  {t('campaign_snake_desc')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('campaign_snake_winners')}</Label>
                    <Input type="number" min={1} placeholder="3" {...register('topN', { valueAsNumber: true })} />
                    <p className="text-[#6b6b80] text-xs">{t('campaign_top_n')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('campaign_snake_reward')}</Label>
                    <Input placeholder="Free drinks" {...register('rewardName')} />
                  </div>
                </div>
              </div>
            )}

            {campaignType === 'EVERY_N' && (
              <div className="space-y-1.5">
                <Label>{t('campaign_every_n')}</Label>
                <Input type="number" min={2} placeholder="e.g. 10" {...register('everyN', { valueAsNumber: true })} />
              </div>
            )}

            {campaignType === 'WEIGHTED_ODDS' && (
              <div className="space-y-1.5">
                <Label>{t('campaign_odds')}</Label>
                <Input type="number" step="0.01" min={0} max={1} placeholder="e.g. 0.1" {...register('winProbability', { valueAsNumber: true })} />
              </div>
            )}

            {!isSnake && (
              <div className="space-y-1.5">
                <Label>{t('campaign_max_entries')}</Label>
                <Input type="number" min={1} {...register('maxEntriesPerUser', { valueAsNumber: true })} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('campaign_schedule')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('campaign_starts')}</Label>
              <Input type="datetime-local" {...register('startsAt')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('campaign_ends')} {isSnake && <span className="text-amber-400">{t('campaign_required_snake')}</span>}</Label>
              <Input type="datetime-local" {...register('endsAt')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('campaign_push_section')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('campaign_push_title')}</Label>
              <Input placeholder={isSnake ? t('campaign_push_title_ph_snake') : t('campaign_push_ph_title')} {...register('pushTitle')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('campaign_push_body')}</Label>
              <Input placeholder={isSnake ? t('campaign_push_body_ph_snake') : t('campaign_push_ph_body')} {...register('pushBody')} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/campaigns">{t('cancel')}</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? t('campaign_submitting') : t('campaign_submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
