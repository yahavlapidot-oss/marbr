'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Building2, MapPin, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';

const BranchMapPicker = dynamic(() => import('@/components/branch-map-picker'), { ssr: false });

type BranchForm = {
  name: string;
  address: string;
  city: string;
  phone?: string;
  lat?: number;
  lng?: number;
};

const DEFAULT_LAT = 32.0853;
const DEFAULT_LNG = 34.7818;

export default function BranchesPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [mapLat, setMapLat] = useState(DEFAULT_LAT);
  const [mapLng, setMapLng] = useState(DEFAULT_LNG);
  const [locationSet, setLocationSet] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<BranchForm>();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: (data: BranchForm) =>
      api.post(`/branches?businessId=${businessId}`, {
        ...data,
        lat: locationSet ? mapLat : undefined,
        lng: locationSet ? mapLng : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setShowForm(false);
      setLocationSet(false);
      setMapLat(DEFAULT_LAT);
      setMapLng(DEFAULT_LNG);
      reset();
      toast.success(t('branch_created'));
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? t('branch_remove_failed')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success(t('branch_removed'));
    },
    onError: () => toast.error(t('branch_remove_failed')),
  });

  const handleLocate = async () => {
    const address = watch('address');
    const city = watch('city');
    const q = [address, city].filter(Boolean).join(', ');
    if (!q.trim()) {
      toast.error(t('branch_address_first'));
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'MrBar-BusinessPanel/1.0' } },
      );
      const results = await res.json();
      if (!results.length) {
        toast.error(t('branch_not_found'));
        return;
      }
      const { lat, lon } = results[0];
      setMapLat(parseFloat(lat));
      setMapLng(parseFloat(lon));
      setLocationSet(true);
      toast.success(t('branch_location_found'));
    } catch {
      toast.error(t('branch_geocoder_error'));
    } finally {
      setGeocoding(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setLocationSet(false);
    setMapLat(DEFAULT_LAT);
    setMapLng(DEFAULT_LNG);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('branches_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('branches_subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t('branches_add')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t('branches_new')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('branches_name')} *</Label>
                  <Input placeholder="Main Bar" {...register('name', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('branches_phone')}</Label>
                  <Input placeholder="+972..." {...register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('branches_city')} *</Label>
                  <Input placeholder="Tel Aviv" {...register('city', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('branches_address')} *</Label>
                  <Input placeholder="Rothschild Blvd 1" {...register('address', { required: true })} />
                </div>
              </div>

              {/* Location picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      {t('branch_map_location')}
                      {locationSet ? (
                        <span className="text-xs text-green-400 font-normal ml-1">{t('branch_location_set')}</span>
                      ) : (
                        <span className="text-xs text-[#6b6b80] font-normal ml-1">({t('campaign_optional')})</span>
                      )}
                    </Label>
                    <p className="text-xs text-[#6b6b80] mt-0.5">
                      {t('branch_location_hint')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLocate}
                    disabled={geocoding}
                  >
                    {geocoding
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      : <Search className="h-3.5 w-3.5 mr-1.5" />}
                    {geocoding ? t('branches_geocoding') : t('branches_find_map')}
                  </Button>
                </div>

                <BranchMapPicker
                  lat={mapLat}
                  lng={mapLng}
                  onLocationChange={(lat, lng) => {
                    setMapLat(lat);
                    setMapLng(lng);
                    setLocationSet(true);
                  }}
                />

                {locationSet && (
                  <p className="text-xs text-[#6b6b80]">
                    Coordinates: {mapLat.toFixed(5)}, {mapLng.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t('save')}
                </Button>
                <Button variant="outline" type="button" onClick={cancelForm}>{t('cancel')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : !branches?.length ? (
          <p className="col-span-3 text-center text-[#6b6b80] py-12">{t('branches_empty')}</p>
        ) : branches.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex items-center gap-1">
                  {b.lat != null ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" /> {t('branches_located')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[#6b6b80] bg-[#2a2a38] px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" /> {t('branches_no_location')}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-white">{b.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-[#6b6b80]">
                <MapPin className="h-3 w-3 shrink-0" />
                {b.address}, {b.city}
              </div>
              {b.phone && <p className="text-sm text-[#6b6b80] mt-1">{b.phone}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
