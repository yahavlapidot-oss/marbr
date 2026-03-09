'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Users, Trophy, CheckCircle, TrendingUp, Plus, Shuffle, Gamepad2, Medal, QrCode, Download, Maximize2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime } from '@/lib/utils';

const ROTATE_EVERY = 60;

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
  const businessId = useAuthStore((s) => s.businessId);

  // Reward state
  const [showAddReward, setShowAddReward] = useState(false);
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

  const { data: leaderboardData, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['snake-leaderboard', id],
    queryFn: () => api.get(`/game/snake/${id}/leaderboard`).then((r) => r.data),
    enabled: !!id && !!data?.campaign && data.campaign.type === 'SNAKE',
    refetchInterval: 10_000,
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

  // QR generation
  const generateQr = useMutation({
    mutationFn: () =>
      api.post('/entries/qr/generate', {}, { params: { campaignId: id, branchId } }).then((r) => r.data),
    onSuccess: (data) => { setQrDataUrl(data.qrDataUrl); setCountdown(ROTATE_EVERY); },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Failed to generate QR'),
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

  const drawSnakeWinners = useMutation({
    mutationFn: () => api.post(`/game/snake/${id}/draw`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-analytics', id] });
      qc.invalidateQueries({ queryKey: ['snake-leaderboard', id] });
    },
  });

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
        <p className="text-white/50 text-sm mb-8">Scan to enter the campaign</p>
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
          <span className="text-white/50 text-sm">Refreshes automatically</span>
        </div>
      </div>
    );
  }

  const { campaign, stats } = data ?? {};
  const rewards: any[] = rewardsData ?? [];
  const isRaffle = campaign?.type === 'RAFFLE';
  const isSnake = campaign?.type === 'SNAKE';
  const leaderboard: any[] = leaderboardData?.leaderboard ?? [];
  const totalPlayers: number = leaderboardData?.totalPlayers ?? 0;

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

      {/* Snake leaderboard + draw */}
      {isSnake && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-amber-500" />
                Live Leaderboard
                <span className="text-xs text-[#6b6b80] font-normal ml-1">({totalPlayers} players · auto-refreshes)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-[#6b6b80] py-6">No scores yet</p>
              ) : (
                <div className="divide-y divide-[#2a2a38]">
                  {leaderboard.map((entry: any) => (
                    <div key={entry.userId} className="flex items-center gap-4 py-3">
                      <span className={`text-lg font-bold w-6 text-center ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-slate-300' :
                        entry.rank === 3 ? 'text-amber-600' : 'text-[#6b6b80]'
                      }`}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{entry.name}</p>
                        <p className="text-xs text-[#6b6b80]">{entry.foodEaten} foods eaten</p>
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
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Draw Snake Winners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6b6b80] mb-4">
                Award the top scorers with the configured prize. Only available after the campaign ends.
              </p>
              <Button
                onClick={() => drawSnakeWinners.mutate()}
                disabled={drawSnakeWinners.isPending || campaign?.status !== 'ENDED'}
                variant={campaign?.status === 'ENDED' ? 'default' : 'outline'}
              >
                {drawSnakeWinners.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Medal className="h-4 w-4" />
                }
                {campaign?.status === 'ENDED' ? 'Draw Winners Now' : 'Campaign must be ended'}
              </Button>
              {drawSnakeWinners.isSuccess && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-green-400 font-medium">✓ Winners drawn!</p>
                  {drawSnakeWinners.data?.data?.winners?.map((w: any) => (
                    <div key={w.userId} className="text-sm text-[#a1a1b5]">
                      #{w.rank} {w.name} — {w.score.toLocaleString()} pts
                    </div>
                  ))}
                </div>
              )}
              {drawSnakeWinners.isError && (
                <p className="text-sm text-red-400 mt-3">Failed to draw winners. Try again.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* QR Code */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-4 w-4 text-amber-500" /> Generate QR Code</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
            >
              <option value="">Select branch…</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <Button
            className="w-full"
            disabled={!branchId || generateQr.isPending}
            onClick={() => generateQr.mutate()}
          >
            {generateQr.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</>
              : <><QrCode className="h-4 w-4 mr-2" /> {qrDataUrl ? 'Regenerate' : 'Generate QR'}</>
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
                <span className="text-[#6b6b80] text-sm">Auto-refreshes in {countdown}s</span>
              </div>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setKiosk(true)}>
                  <Maximize2 className="h-4 w-4 mr-1" /> Kiosk
                </Button>
                <Button variant="outline" className="flex-1" onClick={downloadQr}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </div>

              <p className="text-[#6b6b80] text-xs text-center">
                Multiple customers can scan the same code. Rotates every 60s — screenshots expire.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
