'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
  website?: string;
  email?: string;
  phone?: string;
};

export default function SettingsPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<BusinessForm>();

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => api.get(`/businesses/${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (business) reset(business);
  }, [business, reset]);

  const update = useMutation({
    mutationFn: (data: BusinessForm) => api.patch(`/businesses/${businessId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business', businessId] }),
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
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
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
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input placeholder="https://…/logo.png" {...register('logoUrl')} />
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

      {update.isSuccess && (
        <p className="text-green-400 text-sm text-right">Changes saved successfully.</p>
      )}
    </div>
  );
}
