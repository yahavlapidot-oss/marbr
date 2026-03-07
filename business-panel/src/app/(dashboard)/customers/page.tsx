'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function CustomersPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/customers`).then((r) => r.data),
    enabled: !!businessId,
  });

  const filtered = customers?.filter((c: any) => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-[#6b6b80] text-sm mt-1">Users who have entered your campaigns</p>
        </div>
        {customers && (
          <div className="flex items-center gap-2 text-sm text-[#6b6b80]">
            <Users className="h-4 w-4" />
            {customers.length} total
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b80]" />
        <Input
          placeholder="Search by name, email or phone…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : filtered?.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-12">No customers found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b6b80]">
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Entries</th>
                  <th className="text-left px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((c: any) => (
                  <tr key={c.id} className="border-b border-[#2a2a3a] last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.name ?? '—'}</p>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
