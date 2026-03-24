'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';

export default function CustomersPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/customers`).then((r) => r.data),
    enabled: !!businessId,
  });

  const filtered = customers?.filter((c: any) => {
    const q = search.toLowerCase();
    return !q || c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('customers_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('customers_subtitle')}</p>
        </div>
        {customers && (
          <div className="flex items-center gap-2 text-sm text-[#6b6b80]">
            <Users className="h-4 w-4" />
            {customers.length} {t('customers_total')}
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b80]" />
        <Input
          placeholder={t('customers_search')}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b6b80]">
                  <th className="text-left px-4 py-3">{t('customers_col_customer')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_phone')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_entries')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_joined')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#2a2a3a]">
                    <td className="px-4 py-3 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : filtered?.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-12">{t('customers_empty')}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b6b80]">
                  <th className="text-left px-4 py-3">{t('customers_col_customer')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_phone')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_entries')}</th>
                  <th className="text-left px-4 py-3">{t('customers_col_joined')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((c: any) => (
                  <tr key={c.id} className="border-b border-[#2a2a3a] last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.fullName ?? '—'}</p>
                      <p className="text-[#6b6b80] text-xs">{c.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b6b80]">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-white">{c._count?.entries ?? 0}</td>
                    <td className="px-4 py-3 text-[#6b6b80]">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
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
