'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type BusinessForm = {
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
};

function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');

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
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
          <p className="text-xs text-[#6b6b80]">JPEG, PNG, WebP — max 5 MB</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const setBusiness = useAuthStore((s) => s.setBusiness);
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
    mutationFn: ({ name, description, logoUrl, coverUrl, website, email, phone }: BusinessForm) =>
      api.patch(`/businesses/${businessId}`, { name, description, logoUrl, coverUrl, website, email, phone }),
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
      };
      const changed = (Object.keys(labels) as (keyof BusinessForm)[]).filter(
        (k) => submitted[k] !== (prev as any)[k],
      );

      toast.success('Changes saved!', {
        description: changed.length
          ? `Updated: ${changed.map((k) => labels[k]).join(', ')}`
          : 'Your business profile is up to date.',
        duration: 4000,
      });
    },
    onError: (err: any) => {
      toast.error('Failed to save', {
        description: err?.response?.data?.message ?? 'Something went wrong. Try again.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#6b6b80] text-sm mt-1">Update your business profile</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Business Info</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-5">
            {/* Logo */}
            <ImageUpload
              label="Logo"
              value={watch('logoUrl')}
              onChange={(url) => setValue('logoUrl', url)}
            />

            {/* Cover photo */}
            <ImageUpload
              label="Cover Photo"
              value={watch('coverUrl')}
              onChange={(url) => setValue('coverUrl', url)}
            />

            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input placeholder="Bar Name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="A brief description…" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input placeholder="contact@bar.com" {...register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+972…" {...register('phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://yourbar.com" {...register('website')} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
