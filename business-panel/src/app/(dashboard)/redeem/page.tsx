'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useLocaleStore } from '@/lib/locale-store';
import { formatDateTime } from '@/lib/utils';

const CODE_LENGTH = 6;

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
  const t = useLocaleStore((s) => s.t);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-lookup when all 6 digits filled
  const code = digits.join('');
  useEffect(() => {
    if (code.length !== CODE_LENGTH) return;
    lookup(code);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookup = async (c: string) => {
    setLoading(true); setError(''); setReward(null); setSuccess(false);
    try {
      const res = await api.get(`/staff/redeem/check/${c.toUpperCase()}`);
      setReward(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('redeem_not_found'));
    } finally {
      setLoading(false);
    }
  };

  const redeem = async () => {
    if (!reward) return;
    setLoading(true); setError('');
    try {
      await api.post('/staff/redeem', { code: reward.code });
      setSuccess(true);
      setReward(null);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('redeem_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (i: number, val: string) => {
    const ch = val.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      setDigits([...pasted.split(''), ...Array(CODE_LENGTH - pasted.length).fill('')]);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    }
    e.preventDefault();
  };

  const reset = () => {
    setDigits(['', '', '', '', '', '']);
    setReward(null); setError(''); setSuccess(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('redeem_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('redeem_subtitle')}</p>
      </div>

      {/* Code input */}
      <Card>
        <CardHeader><CardTitle>{t('redeem_code')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                className="h-14 w-11 rounded-lg border border-[#2a2a38] bg-[#1a1a24] text-center text-xl font-bold uppercase text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                autoFocus={i === 0}
              />
            ))}
          </div>
          <p className="text-center text-xs text-[#6b6b80]">{t('redeem_enter_code_hint')}</p>

          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-red-400 text-sm">
              <XCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('redeem_success')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward details + confirm */}
      {reward && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('redeem_found')}
              <Badge variant={reward.status === 'ACTIVE' ? 'active' : 'destructive'}>{reward.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">{t('redeem_customer')}</span>
                <span className="text-white font-medium">{reward.user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">{t('redeem_reward')}</span>
                <span className="text-white font-medium">{reward.reward.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">{t('redeem_campaign')}</span>
                <span className="text-white">{reward.reward.campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b80]">{t('rewards_col_won')}</span>
                <span className="text-white">{formatDateTime(reward.wonAt)}</span>
              </div>
              {reward.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-[#6b6b80]">{t('redeem_expires')}</span>
                  <span className="text-yellow-400">{formatDateTime(reward.expiresAt)}</span>
                </div>
              )}
            </div>

            {reward.status === 'ACTIVE' && (
              <>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={redeem} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {loading ? t('redeem_confirming') : t('redeem_confirm')}
                  </Button>
                  <Button variant="ghost" onClick={reset}>{t('cancel')}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
