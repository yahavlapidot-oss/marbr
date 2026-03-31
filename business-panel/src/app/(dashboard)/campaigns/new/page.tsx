'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import { usePlan, planAtLeast } from '@/lib/use-plan';
import { UpgradeModal } from '@/components/upgrade-modal';

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['RAFFLE', 'INSTANT_WIN', 'EVERY_N', 'WEIGHTED_ODDS', 'SNAKE', 'POINT_GUESS']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  everyN: z.number().int().min(2).optional(),
  winProbability: z.number().min(0).max(1).optional(),
  topN: z.number().int().min(1).optional(),
  pushTitle: z.string().optional(),
  pushBody: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [error, setError] = useState('');
  const [rewardProductId, setRewardProductId] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'advanced_types' | 'campaign_limit'>('advanced_types');
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>('STARTER');
  const plan = usePlan();
  const ADVANCED_TYPES = ['SNAKE', 'POINT_GUESS', 'WEIGHTED_ODDS'];

  const { data: products = [] } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => api.get(`/products?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'RAFFLE', topN: 3 },
  });

  const campaignType = watch('type');
  const isSnake = campaignType === 'SNAKE';
  const isPointGuess = campaignType === 'POINT_GUESS';

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = { ...data };
      if (!payload.startsAt) delete payload.startsAt;
      else payload.startsAt = new Date(payload.startsAt).toISOString();
      if (!payload.endsAt) delete payload.endsAt;
      else payload.endsAt = new Date(payload.endsAt).toISOString();

      const topN = payload.topN;
      delete payload.topN;

      const res = await api.post(`/campaigns?businessId=${businessId}`, payload);
      const campaignId = res.data.id;

      // For SNAKE / POINT_GUESS: auto-create reward linked to the selected product
      if ((isSnake || isPointGuess) && campaignId) {
        const selectedProduct = (products as any[]).find((p: any) => p.id === rewardProductId);
        await api.post(`/rewards/campaign/${campaignId}`, {
          name: selectedProduct ? selectedProduct.name : 'Winner Prize',
          productId: selectedProduct?.id || undefined,
          inventory: topN ?? 3,
        });
      }

      router.push('/campaigns');
    } catch (err: any) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 403 && body?.requiredPlan) {
        setUpgradeReason('campaign_limit');
        setUpgradeRequiredPlan(body.requiredPlan);
        setUpgradeOpen(true);
        return;
      }
      setError(body?.message ?? 'Failed to create campaign');
    }
  };

  return (
    <>
    <UpgradeModal
      open={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
      requiredPlan={upgradeRequiredPlan}
      featureName={upgradeReason === 'campaign_limit' ? t('upgrade_more_campaigns') : t('upgrade_advanced_types')}
    />
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
                onValueChange={(v) => {
                  if (ADVANCED_TYPES.includes(v) && !planAtLeast(plan, 'GROWTH')) {
                    setUpgradeReason('advanced_types');
                    setUpgradeRequiredPlan('GROWTH');
                    setUpgradeOpen(true);
                    return;
                  }
                  setValue('type', v as FormData['type']);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('campaign_type_select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAFFLE">{t('campaigns_type_raffle')}</SelectItem>
                  <SelectItem value="EVERY_N">{t('campaigns_type_every_n')}</SelectItem>
                  <SelectItem value="SNAKE">🐍 {t('campaigns_type_snake')}</SelectItem>
                  <SelectItem value="POINT_GUESS">🔢 {t('campaigns_type_point_guess')}</SelectItem>
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
                    <select
                      className="w-full rounded-md border border-[#2a2a38] bg-[#13131a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={rewardProductId}
                      onChange={(e) => setRewardProductId(e.target.value)}
                    >
                      <option value="">{t('campaign_prize_select_product')}</option>
                      {(products as any[]).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}{p.price != null ? ` — ₪${p.price}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {isPointGuess && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
                <p className="text-amber-400 text-sm font-medium">🔢 {t('campaigns_type_point_guess')}</p>
                <p className="text-[#6b6b80] text-xs">
                  {t('campaign_point_guess_desc')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('campaign_snake_winners')}</Label>
                    <Input type="number" min={1} placeholder="3" {...register('topN', { valueAsNumber: true })} />
                    <p className="text-[#6b6b80] text-xs">{t('campaign_top_n')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('campaign_snake_reward')}</Label>
                    <select
                      className="w-full rounded-md border border-[#2a2a38] bg-[#13131a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={rewardProductId}
                      onChange={(e) => setRewardProductId(e.target.value)}
                    >
                      <option value="">{t('campaign_prize_select_product')}</option>
                      {(products as any[]).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}{p.price != null ? ` — ₪${p.price}` : ''}</option>
                      ))}
                    </select>
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
              <Label>{t('campaign_ends')} {(isSnake || isPointGuess) && <span className="text-amber-400">{t('campaign_required_snake')}</span>}</Label>
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
    </>
  );
}
