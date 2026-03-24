'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Megaphone,
  Gift,
  Users,
  UserCog,
  Package,
  BarChart3,
  Settings,
  QrCode,
  ScanLine,
  Building2,
  LogOut,
  Beer,
  CreditCard,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/rewards', icon: Gift, label: 'Rewards' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/employees', icon: UserCog, label: 'Employees' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/qr', icon: QrCode, label: 'QR Generator' },
  { href: '/redeem', icon: ScanLine, label: 'Redeem' },
  { href: '/branches', icon: Building2, label: 'Branches' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, businessId, business: storedBusiness, logout } = useAuthStore();

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
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#6b6b80] hover:bg-[#1e1e2e] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
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
