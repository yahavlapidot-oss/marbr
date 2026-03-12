'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Beer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const passwordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type PasswordForm = z.infer<typeof passwordSchema>;

function parseError(err: any): string {
  const msg: string = err?.response?.data?.message ?? '';
  const status: number = err?.response?.status ?? 0;
  if (!navigator.onLine) return 'No connection. Check your internet.';
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') return 'Request timed out. Try again.';
  if (status === 401 || status === 403) {
    if (msg.toLowerCase().includes('deactivated')) return 'Your account has been deactivated. Contact support.';
    return 'Invalid credentials.';
  }
  return msg || 'Something went wrong. Try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBusinessId = useAuthStore((s) => s.setBusinessId);
  const setBusiness = useAuthStore((s) => s.setBusiness);
  const [tab, setTab] = useState<'password' | 'otp'>('password');
  const [error, setError] = useState('');

  // ── Password tab ──────────────────────────────────────────────────────────
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onPasswordSubmit = async (data: PasswordForm) => {
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAuth(user, accessToken, refreshToken);
      // Fetch and store businessId
      try {
        const biz = await api.get('/businesses/my');
        if (biz.data?.[0]) setBusiness(biz.data[0]);
      } catch { /* ignore */ }
      router.push('/dashboard');
    } catch (err: any) {
      setError(parseError(err));
    }
  };

  // ── OTP tab ───────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (secs: number) => {
    setCooldown(secs);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const sendOtp = async () => {
    if (!phone.trim()) return;
    setOtpLoading(true); setError('');
    try {
      await api.post('/auth/otp/send', { target: phone.trim() });
      setOtpSent(true);
      setAttempts(0);
      startCooldown(30);
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6 || attempts >= 5) return;
    setOtpLoading(true); setError('');
    try {
      const res = await api.post('/auth/otp/verify', { target: phone.trim(), code: otp });
      const { user, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAuth(user, accessToken, refreshToken);
      try {
        const biz = await api.get('/businesses/my');
        if (biz.data?.[0]) setBusiness(biz.data[0]);
      } catch { /* ignore */ }
      router.push('/dashboard');
    } catch (err: any) {
      const next = attempts + 1;
      setAttempts(next);
      const msg: string = err?.response?.data?.message ?? '';
      if (next >= 5) setError('Too many attempts. Please request a new code.');
      else if (msg.toLowerCase().includes('expired')) setError('Code expired. Request a new one.');
      else setError(parseError(err));
      setOtp('');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Beer className="h-9 w-9 text-amber-500" />
            <span className="text-3xl font-bold text-white">MrBar</span>
          </div>
          <p className="text-[#6b6b80] text-sm">Business Panel</p>
        </div>

        <div className="rounded-xl border border-[#2a2a38] bg-[#1a1a24] p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white mb-4">Sign in</h1>

          {/* Tab toggle */}
          <div className="flex rounded-lg border border-[#2a2a38] bg-[#0f0f13] p-1 mb-5">
            {(['password', 'otp'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  tab === t ? 'bg-amber-500 text-black' : 'text-[#6b6b80] hover:text-white'
                }`}
              >
                {t === 'password' ? 'Email & Password' : 'Phone / OTP'}
              </button>
            ))}
          </div>

          {tab === 'password' ? (
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="you@bar.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" {...register('password')} />
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign in
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Phone number</Label>
                    <Input
                      type="tel"
                      placeholder="+972 50 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
                  <Button className="w-full" disabled={otpLoading || !phone.trim()} onClick={sendOtp}>
                    {otpLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Send Code
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#6b6b80]">Code sent to <span className="text-white font-medium">{phone}</span></p>
                  <div className="space-y-1.5">
                    <Label>6-digit code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="------"
                      value={otp}
                      disabled={attempts >= 5}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-[0.5em] font-bold"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
                  <Button className="w-full" disabled={otpLoading || otp.length !== 6 || attempts >= 5} onClick={verifyOtp}>
                    {otpLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Verify Code
                  </Button>
                  <div className="text-center">
                    {cooldown > 0 ? (
                      <p className="text-sm text-[#6b6b80]">Resend in {cooldown}s</p>
                    ) : (
                      <button type="button" className="text-sm text-amber-400 hover:underline" onClick={sendOtp}>
                        Resend code
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm text-[#6b6b80] mt-4">
            No account?{' '}
            <Link href="/register" className="text-amber-400 hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
