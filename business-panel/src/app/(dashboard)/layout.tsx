'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, X, Menu, Beer } from 'lucide-react';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { api } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, businessId, _hasHydrated, setBusiness } = useAuthStore();
  const t = useLocaleStore((s) => s.t);
  const [showBanner, setShowBanner] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !user) router.push('/login');
  }, [_hasHydrated, user, router]);

  useEffect(() => {
    if (!_hasHydrated || !businessId) return;
    api.get('/businesses/my').then((r) => {
      if (r.data?.[0]) setBusiness(r.data[0]);
    }).catch(() => {});
  }, [_hasHydrated, businessId, setBusiness]);

  useEffect(() => {
    if (!businessId) return;
    api
      .get(`/billing/subscription?businessId=${businessId}`)
      .then((r) => {
        if (r.data.plan === 'FREE') setShowBanner(true);
      })
      .catch(() => {});
  }, [businessId]);

  if (!_hasHydrated) return null;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f13]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2a2a38] bg-[#0f0f13] shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1 text-[#a1a1b5] hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-500" />
            <span className="text-white font-bold tracking-tight">MrBar</span>
          </div>
          {/* Spacer to balance the hamburger */}
          <div className="w-7" />
        </div>

        {showBanner && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm shrink-0">
            <div className="flex items-center gap-2 text-amber-300 min-w-0">
              <Zap className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">
                <span className="hidden sm:inline">You're on the </span>
                <strong>{t('banner_free_plan')}</strong>
                <span className="hidden sm:inline"> — {t('banner_limited')}.</span>{' '}
                <Link href="/billing" className="underline font-semibold hover:text-amber-200">
                  {t('banner_upgrade')}
                </Link>
              </span>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-amber-400 hover:text-amber-200 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8">{children}</div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1a1a24', border: '1px solid #2a2a38', color: '#fff' },
        }}
      />
    </div>
  );
}
