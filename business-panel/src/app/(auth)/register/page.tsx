'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Beer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const BUSINESS_TYPES = ['BAR', 'PUB', 'CLUB', 'RESTAURANT', 'ENTERTAINMENT', 'FESTIVAL'] as const;

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  businessType: z.enum(BUSINESS_TYPES),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBusinessId = useAuthStore((s) => s.setBusinessId);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      // 1. Register user as OWNER
      const authRes = await api.post('/auth/register', {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = authRes.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAuth(user, accessToken, refreshToken);

      // 2. Create business
      const bizRes = await api.post('/businesses', { name: data.businessName, type: data.businessType });
      setBusinessId(bizRes.data.id);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
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
          <h1 className="text-xl font-semibold text-white mb-6">Create account</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Jane Smith" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

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

            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input placeholder="My Bar" {...register('businessName')} />
              {errors.businessName && <p className="text-xs text-red-400">{errors.businessName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <select
                {...register('businessType')}
                className="w-full rounded-md border border-[#2a2a38] bg-[#0f0f13] px-3 py-2 text-sm text-white"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
              {errors.businessType && <p className="text-xs text-red-400">{errors.businessType.message}</p>}
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-[#6b6b80] mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
