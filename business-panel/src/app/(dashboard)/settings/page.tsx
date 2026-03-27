'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload, X } from 'lucide-react';
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

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => api.get(`/businesses/${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const update = useMutation({
    mutationFn: (data: BusinessForm) =>
      api.patch(`/businesses/${businessId}`, data),
    onSuccess: (res, submitted) => {
      qc.invalidateQueries({ queryKey: ['business', businessId] });
      qc.invalidateQueries({ queryKey: ['business-sidebar', businessId] });
      setBusiness(res.data);

      // Build a human-readable list of what changed
      const prev = business ?? {};
      const labels: Record<keyof BusinessForm, string> = {
        name: 'Business name',
        description: 'Description',
        logoUrl: 'Logo',
        coverUrl: 'Cover photo',
        email: 'Email',
        phone: 'Phone',
        website: 'Website',
        address: 'Address',
        city: 'City',
        lat: 'Latitude',
        lng: 'Longitude',
      };
      const changed = (Object.keys(labels) as (keyof BusinessForm)[]).filter(
        (k) => submitted[k] !== (prev as any)[k],
      );

      toast.success(t('settings_saved'), {
        description: changed.length
          ? `Updated: ${changed.map((k) => labels[k]).join(', ')}`
          : t('settings_up_to_date'),
        duration: 4000,
      });
    },
    onError: (err: any) => {
      toast.error(t('settings_save_failed'), {
        description: err?.response?.data?.message ?? t('settings_went_wrong'),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="rounded-xl border border-[#2a2a38] bg-[#1a1a24] p-6 space-y-5">
          <Skeleton className="h-5 w-28 mb-2" />
          {/* Logo + cover */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
          {/* Fields */}
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('settings_subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('settings_business_info')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-5">
            {/* Logo */}
            <ImageUpload
              label={t('settings_logo')}
              value={watch('logoUrl')}
              onChange={(url) => setValue('logoUrl', url)}
              uploadLabel={t('settings_upload')}
              uploadingLabel={t('settings_uploading')}
            />

            {/* Cover photo */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('settings_lat')}</Label>
                <Input type="number" step="any" placeholder="32.0853" {...register('lat', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings_lng')}</Label>
                <Input type="number" step="any" placeholder="34.7818" {...register('lng', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('settings_save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
