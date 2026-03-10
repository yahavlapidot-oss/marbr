'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, businessId } = useAuthStore();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  useEffect(() => {
    if (!businessId) return;
    api
      .get(`/billing/subscription?businessId=${businessId}`)
      .then((r) => {
        const sub = r.data;
        if (sub.plan === 'FREE') setShowBanner(true);
      })
      .catch(() => {});
  }, [businessId]);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f13]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showBanner && (
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm">
            <div className="flex items-center gap-2 text-amber-300">
              <Zap className="h-4 w-4 shrink-0" />
              <span>
                You're on the <strong>Free plan</strong> — limited to 1 active campaign.{' '}
                <Link href="/billing" className="underline font-semibold hover:text-amber-200">
                  Upgrade now
                </Link>{' '}
                to unlock more campaigns, Snake game, and full analytics.
              </span>
            </div>
            <button onClick={() => setShowBanner(false)} className="text-amber-400 hover:text-amber-200 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
