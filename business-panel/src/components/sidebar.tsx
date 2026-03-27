'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Megaphone,
  Package,
  BarChart3,
  Settings,
  ScanLine,
  Building2,
  LogOut,
  Beer,
  CreditCard,
  X,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { api } from '@/lib/api';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, businessId, business: storedBusiness, logout } = useAuthStore();
  const { locale, setLocale, t } = useLocaleStore();

  const nav = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav_dashboard') },
    { href: '/campaigns', icon: Megaphone, label: t('nav_campaigns') },
    { href: '/products', icon: Package, label: t('nav_products') },
    { href: '/analytics', icon: BarChart3, label: t('nav_analytics') },
    { href: '/redeem', icon: ScanLine, label: t('nav_redeem') },
    { href: '/branches', icon: Building2, label: t('nav_branches') },
    { href: '/billing', icon: CreditCard, label: t('nav_billing') },
    { href: '/settings', icon: Settings, label: t('nav_settings') },
  ];

  const { data: fetchedBusiness } = useQuery({
    queryKey: ['business-sidebar', businessId],
    queryFn: () => api.get(`/businesses/${businessId}`).then((r) => r.data),
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const business = fetchedBusiness ?? storedBusiness;

  const navContent = (
    <>
      {/* Logo / header */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-[#2a2a38] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-8 w-8 rounded-lg object-cover border border-[#2a2a38] shrink-0"
            />
          ) : (
            <Beer className="h-7 w-7 text-amber-500 shrink-0" />
          )}
          <span className="text-base font-bold text-white tracking-tight truncate">MrBar</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 text-[#6b6b80] hover:text-white transition-colors shrink-0"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-[#a1a1b5] hover:bg-[#1e1e2e] hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[#2a2a38] p-4 shrink-0">
        <div className="mb-3">
          <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
          <p className="text-xs text-[#6b6b80] truncate">{user?.email ?? user?.phone}</p>
        </div>

        {/* Language toggle */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Languages className="h-3.5 w-3.5 text-[#6b6b80]" />
            <span className="text-xs text-[#6b6b80]">{t('language')}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setLocale('he')}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                locale === 'he'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-[#6b6b80] hover:bg-[#1e1e2e] hover:text-white border border-transparent',
              )}
            >
              {t('lang_he')}
            </button>
            <button
              onClick={() => setLocale('en')}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                locale === 'en'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-[#6b6b80] hover:bg-[#1e1e2e] hover:text-white border border-transparent',
              )}
            >
              {t('lang_en')}
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#6b6b80] hover:bg-[#1e1e2e] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t('nav_logout')}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible on md+) ── */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r border-[#2a2a38] bg-[#0f0f13] shrink-0">
        {navContent}
      </aside>

      {/* ── Mobile: backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onMobileClose}
      />

      {/* ── Mobile: slide-out drawer ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 border-r border-[#2a2a38] bg-[#0f0f13] md:hidden',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
