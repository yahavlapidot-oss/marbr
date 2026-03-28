'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload, X, MapPin } from 'lucide-react';
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

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-[#2a2a38] bg-[#0f0f13]" style={{ height: 280 }}>
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6b6b80]" />
      </div>
    </div>
  ),
});

type BusinessForm = {
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
};

function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useLocaleStore((s) => s.t);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Save className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">{t('settings_confirm_title')}</h3>
            <p className="text-[#6b6b80] text-sm mt-0.5">{t('settings_confirm_body')}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {t('settings_confirm_cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('settings_confirm_yes')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImageUpload({
  label,
  value,
  onChange,
  uploadLabel,
  uploadingLabel,
}: {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  uploadLabel?: string;
  uploadingLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const t = useLocaleStore((s) => s.t);

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.url);
      onChange(data.url);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="h-16 w-16 rounded-lg object-cover border border-[#2a2a38]"
            />
            <button
              type="button"
              onClick={() => { setPreview(''); onChange(''); }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 hover:bg-red-400"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed border-[#2a2a38] flex items-center justify-center bg-[#0f0f13]">
            <Upload className="h-5 w-5 text-[#6b6b80]" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {uploading ? (uploadingLabel ?? 'Uploading…') : (uploadLabel ?? 'Upload image')}
          </Button>
          <p className="text-xs text-[#6b6b80]">{t('settings_jpeg_hint')}</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const setBusiness = useAuthStore((s) => s.setBusiness);
  const t = useLocaleStore((s) => s.t);
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<BusinessForm>();

  const [pendingData, setPendingData] = useState<BusinessForm | null>(null);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => api.get(`/businesses/${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const update = useMutation({
    mutationFn: (data: BusinessForm) => {
      const { name, description, email, phone, website, logoUrl, coverUrl, address, city, lat, lng } = data;
      return api.patch(`/businesses/${businessId}`, { name, description, email, phone, website, logoUrl, coverUrl, address, city, lat, lng });
    },
    onSuccess: (res, submitted) => {
      setPendingData(null);
      qc.invalidateQueries({ queryKey: ['business', businessId] });
      qc.invalidateQueries({ queryKey: ['business-sidebar', businessId] });
      setBusiness(res.data);

      const prev = business ?? {};
      const labels: Partial<Record<keyof BusinessForm, string>> = {
        name: 'Business name', description: 'Description', logoUrl: 'Logo',
        coverUrl: 'Cover photo', email: 'Email', phone: 'Phone',
        website: 'Website', address: 'Address', city: 'City',
      };
      const changed = (Object.keys(labels) as (keyof BusinessForm)[]).filter(
        (k) => k in labels && submitted[k] !== (prev as any)[k],
      );
      toast.success(t('settings_saved'), {
        description: changed.length
          ? `Updated: ${changed.map((k) => labels[k]).join(', ')}`
          : t('settings_up_to_date'),
        duration: 4000,
      });
    },
    onError: (err: any) => {
      setPendingData(null);
      toast.error(t('settings_save_failed'), {
        description: err?.response?.data?.message ?? t('settings_went_wrong'),
      });
    },
  });

  const lat = watch('lat');
  const lng = watch('lng');
  const addressValue = watch('address');
  const cityValue = watch('city');
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = [addressValue, cityValue].filter(Boolean).join(', ');
    if (!query || query.length < 5) return;

    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        const data = await res.json();
        if (data[0]) {
          setValue('lat', parseFloat(parseFloat(data[0].lat).toFixed(6)));
          setValue('lng', parseFloat(parseFloat(data[0].lon).toFixed(6)));
        }
      } catch {
        // silent — user can still place pin manually
      }
    }, 800);

    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [addressValue, cityValue, setValue]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="rounded-xl border border-[#2a2a38] bg-[#1a1a24] p-6 space-y-5">
          <Skeleton className="h-5 w-28 mb-2" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={!!pendingData}
        onConfirm={() => pendingData && update.mutate(pendingData)}
        onCancel={() => setPendingData(null)}
        isPending={update.isPending}
      />

      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('settings_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('settings_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit((d) => setPendingData(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('settings_business_info')}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <ImageUpload
                label={t('settings_logo')}
                value={watch('logoUrl')}
                onChange={(url) => setValue('logoUrl', url)}
                uploadLabel={t('settings_upload')}
                uploadingLabel={t('settings_uploading')}
              />
              <ImageUpload
                label={t('settings_cover')}
                value={watch('coverUrl')}
                onChange={(url) => setValue('coverUrl', url)}
                uploadLabel={t('settings_upload')}
                uploadingLabel={t('settings_uploading')}
              />
              <div className="space-y-1.5">
                <Label>{t('settings_name')}</Label>
                <Input placeholder={t('settings_bar_name_ph')} {...register('name', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings_description')}</Label>
                <Input placeholder={t('settings_desc_ph')} {...register('description')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('settings_email')}</Label>
                  <Input placeholder={t('settings_email_ph')} {...register('email')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('settings_phone')}</Label>
                  <Input placeholder={t('settings_phone_ph')} {...register('phone')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings_website')}</Label>
                <Input placeholder={t('settings_website_ph')} {...register('website')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('settings_address')}</Label>
                  <Input placeholder={t('settings_address_ph')} {...register('address')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('settings_city')}</Label>
                  <Input placeholder={t('settings_city_ph')} {...register('city')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                {t('settings_location_map')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#6b6b80] text-sm">{t('settings_map_hint')}</p>

              <LocationPicker
                lat={Number(lat) || 32.0853}
                lng={Number(lng) || 34.7818}
                onChange={(newLat, newLng) => {
                  setValue('lat', parseFloat(newLat.toFixed(6)));
                  setValue('lng', parseFloat(newLng.toFixed(6)));
                }}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">
              <Save className="h-4 w-4" />
              {t('settings_save')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
