'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Package, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';

type ProductForm = { name: string; description?: string; price?: number; sku?: string };

export default function ProductsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<ProductForm>();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => api.get(`/products?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: (data: ProductForm) => api.post(`/products?businessId=${businessId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowForm(false); reset(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('products_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('products_subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t('products_add')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t('products_new')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>{t('products_name')}</Label>
                <Input placeholder="Heineken 330ml" {...register('name', { required: true })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>{t('products_description')}</Label>
                <Input placeholder="Optional description" {...register('description')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('products_price')}</Label>
                <Input type="number" step="0.01" placeholder="12.00" {...register('price', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('products_sku')}</Label>
                <Input placeholder="HNK-330" {...register('sku')} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t('products_save')}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
            <div className="divide-y divide-[#2a2a38]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
        ) : products?.length === 0 ? (
          <p className="col-span-3 text-center text-[#6b6b80] py-12">{t('products_empty')}</p>
        ) : products?.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-500" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
              <h3 className="font-semibold text-white">{p.name}</h3>
              {p.description && <p className="text-sm text-[#6b6b80] mt-1">{p.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-sm">
                {p.price != null && <span className="text-amber-400 font-medium">₪{p.price}</span>}
                {p.sku && <span className="text-[#6b6b80]">SKU: {p.sku}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
