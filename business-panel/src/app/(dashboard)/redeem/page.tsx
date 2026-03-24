'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { formatDateTime } from '@/lib/utils';

type RewardInfo = {
  id: string;
  code: string;
  status: string;
  expiresAt?: string;
  wonAt: string;
  user: { fullName: string };
  reward: { name: string; description?: string; campaign: { name: string } };
};

export default function RedeemPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setReward(null); setSuccess(false);
    try {
      const res = await api.get(`/staff/redeem/check/${code.trim()}`);
      setReward(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Reward not found');
    } finally {
      setLoading(false);
    }
  };

  const redeem = async () => {
    if (!reward || !branchId) return;
    setLoading(true); setError('');
    try {
      await api.post('/staff/redeem', { code: reward.code, branchId });
      setSuccess(true); setReward(null); setCode(''); setBranchId('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('redeem_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('redeem_subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Enter Reward Code</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste or type reward code..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
            />
            <Button onClick={lookup} disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-red-400 text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Reward redeemed successfully!
            </div>
          )}
        </CardContent>
      </Card>

      {reward && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Reward Found
              <Badge variant={reward.status === 'ACTIVE' ? 'active' : 'destructive'}>
                {reward.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">Customer</span>
                <span className="text-white font-medium">{reward.user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">Reward</span>
                <span className="text-white font-medium">{reward.reward.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">Campaign</span>
                <span className="text-white">{reward.reward.campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">Won at</span>
                <span className="text-white">{formatDateTime(reward.wonAt)}</span>
              </div>
              {reward.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-[#6b6b80]">Expires</span>
                  <span className="text-yellow-400">{formatDateTime(reward.expiresAt)}</span>
                </div>
              )}
            </div>

            {reward.status === 'ACTIVE' && (
              <>
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Select branch...</option>
                    {(branches ?? []).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  onClick={redeem}
                  disabled={loading || !branchId}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark as Redeemed
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
