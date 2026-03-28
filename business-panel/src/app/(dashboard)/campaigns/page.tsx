'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, StopCircle, Loader2, BarChart2, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { formatDateTime } from '@/lib/utils';

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  CANCELLED: 'destructive',
};

const PAGE_SIZE = 10;

export default function CampaignsPage() {
  const { businessId, business: storedBusiness } = useAuthStore();
  const t = useLocaleStore((s) => s.t);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/campaigns`).then((r) => r.data),
    enabled: !!businessId,
    refetchInterval: 30_000,
  });

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/campaigns/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Action failed'),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/duplicate`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`"${res.data.name}" created as a draft`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Duplicate failed'),
  });

  const headers = [
    t('campaigns_col_name'),
    t('campaigns_col_type'),
    t('campaigns_col_status'),
    t('campaigns_col_entries'),
    t('campaigns_col_ends'),
    t('campaigns_col_actions'),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('campaigns_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('campaigns_subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            {t('campaigns_new')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a38]">
                  {headers.map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#6b6b80] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a38]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-md" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : !campaigns?.length ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-[#6b6b80] mb-4">{t('campaigns_empty')}</p>
              <Button asChild size="sm">
                <Link href="/campaigns/new">{t('campaigns_empty_sub')}</Link>
              </Button>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a38]">
                  {headers.map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#6b6b80] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a38]">
                {campaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#1e1e2e] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const logo = c.business?.logoUrl ?? storedBusiness?.logoUrl;
                          return logo ? (
                            <img
                              src={logo}
                              alt={c.business?.name ?? ''}
                              className="h-8 w-8 rounded-lg object-cover border border-[#2a2a38] shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-[#2a2a38] flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#6b6b80]">
                                {c.name?.[0]?.toUpperCase()}
                              </span>
                            </div>
                          );
                        })()}
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-white hover:text-amber-400">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#a1a1b5]">{c.type.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#a1a1b5]">{c._count?.entries ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-[#a1a1b5]">
                      {c.endsAt ? formatDateTime(c.endsAt) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {c.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('campaigns_publish')}
                            onClick={() => transition.mutate({ id: c.id, action: 'publish' })}
                          >
                            <Play className="h-4 w-4 text-green-400" />
                          </Button>
                        )}
                        {c.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('campaigns_pause')}
                            onClick={() => transition.mutate({ id: c.id, action: 'pause' })}
                          >
                            <Pause className="h-4 w-4 text-yellow-400" />
                          </Button>
                        )}
                        {c.status === 'PAUSED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('campaigns_resume')}
                            onClick={() => transition.mutate({ id: c.id, action: 'resume' })}
                          >
                            <Play className="h-4 w-4 text-green-400" />
                          </Button>
                        )}
                        {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('campaigns_end')}
                            onClick={() => transition.mutate({ id: c.id, action: 'end' })}
                          >
                            <StopCircle className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('campaigns_duplicate')}
                          onClick={() => duplicate.mutate(c.id)}
                          disabled={duplicate.isPending}
                        >
                          <Copy className="h-4 w-4 text-[#6b6b80]" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Analytics" asChild>
                          <Link href={`/campaigns/${c.id}`}>
                            <BarChart2 className="h-4 w-4 text-[#6b6b80]" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {campaigns.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a38]">
                <p className="text-sm text-[#6b6b80]">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, campaigns.length)} / {campaigns.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="px-3"
                  >
                    ‹
                  </Button>
                  {Array.from({ length: Math.ceil(campaigns.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(p)}
                      className={`px-3 ${p === page ? 'bg-amber-500/20 text-amber-400' : 'text-[#6b6b80]'}`}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === Math.ceil(campaigns.length / PAGE_SIZE)}
                    className="px-3"
                  >
                    ›
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
