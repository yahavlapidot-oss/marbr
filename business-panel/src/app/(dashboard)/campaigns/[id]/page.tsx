'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Users, Trophy, CheckCircle, TrendingUp,
  Plus, Shuffle, Gamepad2, Medal, QrCode, Download, Maximize2, X,
  Play, Pause, StopCircle, Pencil, ChevronDown, ChevronUp,
  Hash, ScanLine, MapPin, CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { type TranslationKey } from '@/lib/i18n/translations';
import { formatDateTime } from '@/lib/utils';

const ROTATE_EVERY = 60;

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: 'active', PAUSED: 'paused', ENDED: 'ended', DRAFT: 'draft', SCHEDULED: 'scheduled', CANCELLED: 'destructive',
};

const METHOD_ICON: Record<string, React.ElementType> = {
  QR_SCAN: QrCode, MANUAL_CODE: Hash, CHECKIN: MapPin, POS_CALLBACK: CreditCard,
};

function formatTimeAgo(dateStr: string, t: (key: TranslationKey) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time_just_now');
  if (mins < 60) return t('time_m_ago').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time_h_ago').replace('{n}', String(hours));
  return t('time_d_ago').replace('{n}', String(Math.floor(hours / 24)));
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

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

type EditForm = {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  maxEntriesPerUser: number;
  everyN: number;
  winProbability: number;
  pushTitle: string;
  pushBody: string;
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);

  const METHOD_LABEL: Record<string, string> = {
    QR_SCAN: t('method_qr'), MANUAL_CODE: t('method_code'), CHECKIN: t('method_checkin'), POS_CALLBACK: t('method_pos'),
  };

  // UI state
  const [showAddReward, setShowAddReward] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardInventory, setRewardInventory] = useState('1');
  const [drawCount, setDrawCount] = useState('1');

  // QR state
  const [branchId, setBranchId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(ROTATE_EVERY);
  const [kiosk, setKiosk] = useState(false);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edit form
  const { register, reset, watch: watchEdit } = useForm<EditForm>();
  const campaignType = useRef('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get(`/campaigns/${id}/analytics`).then((r) => r.data),
  });

  const { data: rewardsData } = useQuery({
    queryKey: ['rewards', id],
    queryFn: () => api.get(`/rewards/campaign/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['snake-leaderboard', id],
    queryFn: () => api.get(`/game/snake/${id}/leaderboard`).then((r) => r.data),
    enabled: !!id && !!data?.campaign && data.campaign.type === 'SNAKE',
    refetchInterval: 10_000,
  });

  // Pre-populate edit form when campaign loads
  useEffect(() => {
    if (data?.campaign) {
      const c = data.campaign;
      campaignType.current = c.type;
      reset({
        name: c.name ?? '',
        description: c.description ?? '',
        startsAt: toDatetimeLocal(c.startsAt),
        endsAt: toDatetimeLocal(c.endsAt),
        maxEntriesPerUser: c.maxEntriesPerUser ?? 1,
        everyN: c.everyN ?? 2,
        winProbability: c.winProbability ?? 0.1,
        pushTitle: c.pushTitle ?? '',
        pushBody: c.pushBody ?? '',
      });
    }
  }, [data?.campaign, reset]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['campaign-analytics', id] });

  const transition = useMutation({
    mutationFn: (action: string) => api.patch(`/campaigns/${id}/${action}`),
    onSuccess: (_, action) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      const labels: Record<string, string> = {
        publish: t('campaign_now_live'),
        pause: t('campaign_paused_msg'),
        resume: t('campaign_resumed_msg'),
        end: t('campaign_ended_msg'),
      };
      toast.success(labels[action] ?? t('action_updated'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('action_failed')),
  });

  const editMutation = useMutation({
    mutationFn: (formData: EditForm) => {
      const payload: Record<string, any> = {};
      if (formData.name) payload.name = formData.name;
      if (formData.description !== undefined) payload.description = formData.description;
      payload.startsAt = formData.startsAt || '';
      payload.endsAt = formData.endsAt || '';
      if (formData.pushTitle !== undefined) payload.pushTitle = formData.pushTitle;
      if (formData.pushBody !== undefined) payload.pushBody = formData.pushBody;
      if (campaignType.current !== 'SNAKE') payload.maxEntriesPerUser = formData.maxEntriesPerUser;
      if (campaignType.current === 'EVERY_N') payload.everyN = formData.everyN;
      if (campaignType.current === 'WEIGHTED_ODDS') payload.winProbability = formData.winProbability;
      return api.patch(`/campaigns/${id}`, payload);
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(t('campaign_updated'));
      setShowEdit(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('campaign_update_failed')),
  });

  const addReward = useMutation({
    mutationFn: (payload: any) => api.post(`/rewards/campaign/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', id] });
      setShowAddReward(false);
      setRewardName(''); setRewardDesc(''); setRewardInventory('1');
      toast.success(t('prize_added'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('prize_add_failed')),
  });

  const drawWinners = useMutation({
    mutationFn: (count: number) => api.post(`/rewards/campaign/${id}/draw`, { count }),
    onSuccess: () => { invalidate(); toast.success(t('winners_drawn')); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('draw_failed')),
  });

  const drawSnakeWinners = useMutation({
    mutationFn: () => api.post(`/game/snake/${id}/draw`),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['snake-leaderboard', id] });
      toast.success(t('winners_drawn'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('draw_failed')),
  });

  // QR generation
  const generateQr = useMutation({
    mutationFn: () =>
      api.post('/entries/qr/generate', {}, { params: { campaignId: id, branchId } }).then((r) => r.data),
    onSuccess: (data) => { setQrDataUrl(data.qrDataUrl); setCountdown(ROTATE_EVERY); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('qr_generate_failed')),
  });

  const stopRotation = useCallback(() => {
    if (rotateRef.current) clearInterval(rotateRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    rotateRef.current = null; countdownRef.current = null;
  }, []);

  const startRotation = useCallback(() => {
    stopRotation();
    setCountdown(ROTATE_EVERY);
    countdownRef.current = setInterval(() => setCountdown((c) => (c <= 1 ? ROTATE_EVERY : c - 1)), 1000);
    rotateRef.current = setInterval(() => generateQr.mutate(), ROTATE_EVERY * 1000);
  }, [stopRotation, generateQr]);

  useEffect(() => { if (qrDataUrl && !rotateRef.current) startRotation(); }, [qrDataUrl]); // eslint-disable-line
  useEffect(() => { stopRotation(); setQrDataUrl(null); }, [branchId, stopRotation]);
  useEffect(() => () => stopRotation(), [stopRotation]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a'); a.href = qrDataUrl; a.download = `qr-campaign-${id}.png`; a.click();
  };

  const circumference = 2 * Math.PI * 24;
  const dashOffset = circumference * (1 - countdown / ROTATE_EVERY);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Kiosk fullscreen overlay
  if (kiosk && qrDataUrl) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <button onClick={() => setKiosk(false)} className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
          <X className="h-5 w-5" />
        </button>
        <p className="text-amber-400 text-lg font-semibold mb-1 tracking-wide uppercase">{data?.campaign?.name}</p>
        <p className="text-white/50 text-sm mb-8">{t('campaign_scan_to_enter')}</p>
        <div className="relative">
          <div className="rounded-2xl bg-white p-5 shadow-2xl">
            <Image src={qrDataUrl} alt="QR Code" width={300} height={300} unoptimized />
          </div>
          <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)]" viewBox="0 0 330 330">
            <circle cx="165" cy="165" r="155" fill="none" stroke="#ffffff10" strokeWidth="4" />
            <circle cx="165" cy="165" r="155" fill="none" stroke="#F5C518" strokeWidth="4"
              strokeDasharray={circumference * (155 / 24)} strokeDashoffset={dashOffset * (155 / 24)}
              strokeLinecap="round" transform="rotate(-90 165 165)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
        </div>
        <div className="mt-8 flex items-center gap-2">
          <svg className="w-10 h-10" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" fill="none" stroke="#ffffff20" strokeWidth="3" />
            <circle cx="26" cy="26" r="24" fill="none" stroke="#F5C518" strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            <text x="26" y="31" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{countdown}</text>
          </svg>
          <span className="text-white/50 text-sm">{t('campaign_detail_qr_rotate')}</span>
        </div>
      </div>
    );
  }

  const { campaign, stats, recentEntries } = data ?? {};
  const rewards: any[] = rewardsData ?? [];
  const entries: any[] = recentEntries ?? [];
  const isRaffle = campaign?.type === 'RAFFLE';
  const isSnake = campaign?.type === 'SNAKE';
  const isEveryN = campaign?.type === 'EVERY_N';
  const isWeightedOdds = campaign?.type === 'WEIGHTED_ODDS';
  const leaderboard: any[] = leaderboardData?.leaderboard ?? [];
  const totalPlayers: number = leaderboardData?.totalPlayers ?? 0;
  const canEdit = campaign?.status && !['ENDED', 'CANCELLED'].includes(campaign.status);
  const isPending = transition.isPending;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
          <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white truncate">{campaign?.name}</h1>
            <Badge variant={STATUS_VARIANT[campaign?.status]}>{campaign?.status}</Badge>
          </div>
          <p className="text-[#6b6b80] text-sm mt-1">
            {campaign?.type?.replace(/_/g, ' ')}
            {campaign?.startsAt && ` · ${t('campaign_starts')} ${formatDateTime(campaign.startsAt)}`}
            {campaign?.endsAt && ` · ${t('campaign_ends')} ${formatDateTime(campaign.endsAt)}`}
          </p>
        </div>
      </div>

      {/* Status controls */}
      {campaign?.status && (
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === 'DRAFT' && (
            <Button onClick={() => transition.mutate('publish')} disabled={isPending} className="bg-green-600 hover:bg-green-500">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t('campaigns_publish')}
            </Button>
          )}
          {campaign.status === 'ACTIVE' && (
            <>
              <Button variant="outline" onClick={() => transition.mutate('pause')} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                {t('campaigns_pause')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(t('campaign_end_confirm'))) transition.mutate('end');
                }}
                disabled={isPending}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <StopCircle className="h-4 w-4" />
                {t('campaigns_end')}
              </Button>
            </>
          )}
          {campaign.status === 'PAUSED' && (
            <>
              <Button onClick={() => transition.mutate('resume')} disabled={isPending} className="bg-green-600 hover:bg-green-500">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t('campaigns_resume')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(t('campaign_end_confirm'))) transition.mutate('end');
                }}
                disabled={isPending}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <StopCircle className="h-4 w-4" />
                {t('campaigns_end')}
              </Button>
            </>
          )}
          {(campaign.status === 'ENDED' || campaign.status === 'CANCELLED') && (
            <div className="flex items-center gap-2 text-sm text-[#6b6b80]">
              <CheckCircle className="h-4 w-4" />
              {t('campaign_status_inactive_msg').replace('{status}', campaign.status.toLowerCase())}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Users} label={t('campaign_detail_entries')} value={stats?.totalEntries ?? 0} />
        <StatTile icon={Trophy} label={t('campaign_detail_winners')} value={stats?.totalWinners ?? 0} />
        <StatTile icon={CheckCircle} label={t('redeem_status_redeemed')} value={stats?.totalRedemptions ?? 0} />
        <StatTile icon={TrendingUp} label={t('campaign_detail_conversion')} value={`${stats?.conversionRate?.toFixed(1) ?? 0}%`} />
      </div>

      {/* Edit Campaign */}
      {canEdit && (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setShowEdit((v) => !v)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-500" />
                {t('campaign_detail_edit')}
              </CardTitle>
              {showEdit ? <ChevronUp className="h-4 w-4 text-[#6b6b80]" /> : <ChevronDown className="h-4 w-4 text-[#6b6b80]" />}
            </div>
          </CardHeader>
          {showEdit && (
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1.5">
                <Label>{t('campaign_name')}</Label>
                <Input {...register('name')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('campaign_description')}</Label>
                <Input placeholder={t('campaign_description_ph')} {...register('description')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('campaign_starts')}</Label>
                  <Input type="datetime-local" {...register('startsAt')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('campaign_ends')}</Label>
                  <Input type="datetime-local" {...register('endsAt')} />
                </div>
              </div>
              {!isSnake && (
                <div className="space-y-1.5">
                  <Label>{t('campaign_max_entries_label')}</Label>
                  <Input type="number" min={1} {...register('maxEntriesPerUser', { valueAsNumber: true })} className="w-40" />
                </div>
              )}
              {isEveryN && (
                <div className="space-y-1.5">
                  <Label>{t('campaign_every_n')}</Label>
                  <Input type="number" min={2} {...register('everyN', { valueAsNumber: true })} className="w-40" />
                </div>
              )}
              {isWeightedOdds && (
                <div className="space-y-1.5">
                  <Label>{t('campaign_odds')}</Label>
                  <Input type="number" step="0.01" min={0} max={1} {...register('winProbability', { valueAsNumber: true })} className="w-40" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t('campaign_push_title')}</Label>
                <Input placeholder={t('campaign_push_title_ph')} {...register('pushTitle')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('campaign_push_body')}</Label>
                <Input placeholder={t('campaign_push_body_ph')} {...register('pushBody')} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => editMutation.mutate(watchEdit() as EditForm)}
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {editMutation.isPending ? t('campaign_detail_saving') : t('campaign_detail_save')}
                </Button>
                <Button variant="ghost" onClick={() => setShowEdit(false)}>{t('cancel')}</Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Raffle draw */}
      {isRaffle && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shuffle className="h-4 w-4 text-amber-500" /> {t('campaign_detail_draw')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[#6b6b80] mb-4">{t('campaign_raffle_desc')}</p>
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label>{t('campaign_raffle_winners')}</Label>
                <Input type="number" min="1" value={drawCount} onChange={(e) => setDrawCount(e.target.value)} className="w-32" />
              </div>
              <Button onClick={() => drawWinners.mutate(parseInt(drawCount) || 1)} disabled={drawWinners.isPending}>
                {drawWinners.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                {drawWinners.isPending ? t('campaign_detail_drawing') : t('campaign_detail_draw')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snake leaderboard + draw */}
      {isSnake && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-amber-500" />
                {t('campaign_detail_leaderboard')}
                <span className="text-xs text-[#6b6b80] font-normal ml-1">({totalPlayers} {t('campaign_snake_players')})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-[#6b6b80] py-6">{t('campaign_no_scores')}</p>
              ) : (
                <div className="divide-y divide-[#2a2a38]">
                  {leaderboard.map((entry: any) => (
                    <div key={entry.userId} className="flex items-center gap-4 py-3">
                      <span className={`text-lg font-bold w-6 text-center ${
                        entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-[#6b6b80]'
                      }`}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{entry.name}</p>
                        <p className="text-xs text-[#6b6b80]">{entry.foodEaten} {t('campaign_foods_eaten')}</p>
                      </div>
                      <span className="text-amber-500 font-bold">{entry.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> {t('campaign_detail_snake_draw')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6b6b80] mb-4">{t('campaign_top_scorers_desc')}</p>
              <Button
                onClick={() => drawSnakeWinners.mutate()}
                disabled={drawSnakeWinners.isPending || campaign?.status !== 'ENDED'}
                variant={campaign?.status === 'ENDED' ? 'default' : 'outline'}
              >
                {drawSnakeWinners.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Medal className="h-4 w-4" />}
                {campaign?.status === 'ENDED' ? t('campaign_detail_snake_draw') : t('campaign_must_end_first')}
              </Button>
              {drawSnakeWinners.isSuccess && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-green-400 font-medium">{t('campaign_winners_drawn')}</p>
                  {drawSnakeWinners.data?.data?.winners?.map((w: any) => (
                    <div key={w.userId} className="text-sm text-[#a1a1b5]">
                      #{w.rank} {w.name} — {w.score.toLocaleString()} pts
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* QR Code */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-4 w-4 text-amber-500" /> {t('campaign_detail_qr')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('qr_branch')}</Label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
            >
              <option value="">{t('qr_select_branch')}</option>
              {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Button className="w-full" disabled={!branchId || generateQr.isPending} onClick={() => generateQr.mutate()}>
            {generateQr.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('campaign_generating')}</>
              : <><QrCode className="h-4 w-4 mr-2" /> {qrDataUrl ? t('campaign_regenerate') : t('campaign_generate_qr')}</>
            }
          </Button>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="relative">
                <div className="rounded-xl bg-white p-4 shadow-xl">
                  <Image src={qrDataUrl} alt="QR Code" width={200} height={200} unoptimized />
                </div>
                <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]" viewBox="0 0 244 244">
                  <circle cx="122" cy="122" r="118" fill="none" stroke="#ffffff10" strokeWidth="3" />
                  <circle cx="122" cy="122" r="118" fill="none" stroke="#F5C518" strokeWidth="3"
                    strokeDasharray={circumference * (118 / 24)} strokeDashoffset={dashOffset * (118 / 24)}
                    strokeLinecap="round" transform="rotate(-90 122 122)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#2a2a3a" strokeWidth="3" />
                  <circle cx="26" cy="26" r="24" fill="none" stroke="#F5C518" strokeWidth="3"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  <text x="26" y="31" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{countdown}</text>
                </svg>
                <span className="text-[#6b6b80] text-sm">{t('campaign_auto_refresh').replace('{n}', String(countdown))}</span>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setKiosk(true)}>
                  <Maximize2 className="h-4 w-4 mr-1" /> {t('campaign_detail_kiosk')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={downloadQr}>
                  <Download className="h-4 w-4 mr-1" /> {t('qr_download')}
                </Button>
              </div>
              <p className="text-[#6b6b80] text-xs text-center">{t('campaign_detail_qr_rotate')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-amber-500" />
            {t('campaign_detail_recent')}
            <span className="text-xs text-[#6b6b80] font-normal ml-1">(last {entries.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-10 text-sm">{t('campaign_detail_no_entries')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a38]">
                    {[t('campaign_detail_col_user'), t('campaign_detail_col_method'), t('campaign_detail_col_time')].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6b6b80] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a38]">
                  {entries.map((e: any) => {
                    const MethodIcon = METHOD_ICON[e.method] ?? Hash;
                    return (
                      <tr key={e.id} className="hover:bg-[#1e1e2e] transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-white">{e.user?.fullName ?? t('unknown_user')}</p>
                          <p className="text-xs text-[#6b6b80]">{e.user?.email ?? e.user?.phone ?? ''}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <MethodIcon className="h-3.5 w-3.5 text-[#6b6b80]" />
                            <span className="text-sm text-[#a1a1b5]">{METHOD_LABEL[e.method] ?? e.method}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-[#6b6b80]">{formatTimeAgo(e.createdAt, t)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prizes / Rewards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('campaign_detail_prizes')}</CardTitle>
          <Button size="sm" onClick={() => setShowAddReward(!showAddReward)}>
            <Plus className="h-4 w-4" /> {t('campaign_detail_add_prize')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddReward && (
            <div className="rounded-lg border border-[#2a2a38] bg-[#1e1e2e] p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('campaign_prize_name')}</Label>
                  <Input placeholder="e.g. Free shots" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('campaign_prize_qty')}</Label>
                  <Input type="number" min="1" value={rewardInventory} onChange={(e) => setRewardInventory(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description ({t('campaign_optional')})</Label>
                <Input placeholder={t('campaign_prize_details_ph')} value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addReward.mutate({ name: rewardName, description: rewardDesc || undefined, inventory: parseInt(rewardInventory) || 1 })}
                  disabled={!rewardName || addReward.isPending}
                >
                  {addReward.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddReward(false)}>{t('cancel')}</Button>
              </div>
            </div>
          )}
          {rewards.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-6 text-sm">{t('campaign_no_prizes')}</p>
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
                    <p className="text-xs text-[#6b6b80]">{t('campaign_detail_allocated')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign config (read-only) */}
      <Card>
        <CardHeader><CardTitle>{t('campaign_detail_config')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {campaign?.description && (
            <div>
              <p className="text-xs text-[#6b6b80] mb-1">{t('campaign_prize_desc_label')}</p>
              <p className="text-sm text-[#a1a1b5]">{campaign.description}</p>
            </div>
          )}
          {campaign?.pushTitle && (
            <div>
              <p className="text-xs text-[#6b6b80] mb-1">{t('campaign_push_section')}</p>
              <div className="rounded-lg bg-[#1e1e2e] border border-[#2a2a38] p-3">
                <p className="font-medium text-white text-sm">{campaign.pushTitle}</p>
                {campaign.pushBody && <p className="text-[#a1a1b5] text-sm mt-1">{campaign.pushBody}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {!isSnake && (
              <div>
                <p className="text-[#6b6b80]">{t('campaign_max_entries_col')}</p>
                <p className="text-white">{campaign?.maxEntriesPerUser ?? 1}</p>
              </div>
            )}
            {campaign?.everyN && (
              <div>
                <p className="text-[#6b6b80]">{t('campaign_every_n')}</p>
                <p className="text-white">{campaign.everyN}</p>
              </div>
            )}
            {campaign?.winProbability && (
              <div>
                <p className="text-[#6b6b80]">{t('campaign_odds')}</p>
                <p className="text-white">{(campaign.winProbability * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
