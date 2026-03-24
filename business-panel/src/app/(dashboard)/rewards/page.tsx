'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  WON: 'bg-green-500/20 text-green-400',
  REDEEMED: 'bg-blue-500/20 text-blue-400',
  EXPIRED: 'bg-red-500/20 text-red-400',
};

export default function RewardsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [search, setSearch] = useState('');

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/campaigns?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards', selectedCampaign],
    queryFn: () => api.get(`/rewards/campaign/${selectedCampaign}`).then((r) => r.data),
    enabled: !!selectedCampaign,
  });

  const filtered = rewards?.filter((r: any) => {
    const q = search.toLowerCase();
    return !q || r.user?.fullName?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('rewards_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('rewards_subtitle')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[220px]"
        >
          <option value="">{t('rewards_filter_campaign')}</option>
          {campaigns?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b80]" />
          <Input
            placeholder={t('rewards_search')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {!selectedCampaign ? (
            <div className="flex flex-col items-center py-16 text-[#6b6b80]">
              <Gift className="h-10 w-10 mb-3 opacity-40" />
              <p>Select a campaign to view rewards</p>
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-[#2a2a38]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-4 w-16 ml-auto" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-12">{t('rewards_empty')}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b6b80]">
                  <th className="text-left px-4 py-3">{t('rewards_col_customer')}</th>
                  <th className="text-left px-4 py-3">{t('rewards_col_reward')}</th>
                  <th className="text-left px-4 py-3">{t('rewards_col_code')}</th>
                  <th className="text-left px-4 py-3">{t('rewards_col_status')}</th>
                  <th className="text-left px-4 py-3">{t('rewards_col_won')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((r: any) => (
                  <tr key={r.id} className="border-b border-[#2a2a3a] last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.user?.fullName ?? r.user?.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b6b80]">{r.reward?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded">{r.code}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b6b80]">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
