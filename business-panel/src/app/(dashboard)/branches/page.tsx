'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Building2, MapPin, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function BranchesPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ name: string; address: string; city: string; phone?: string }>();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post(`/branches?businessId=${businessId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setShowForm(false); reset(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branches</h1>
          <p className="text-[#6b6b80] text-sm mt-1">Manage your venue locations</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Branch</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Main Bar" {...register('name', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="Tel Aviv" {...register('city', { required: true })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input placeholder="Rothschild Blvd 1" {...register('address', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+972..." {...register('phone')} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : branches?.length === 0 ? (
          <p className="col-span-3 text-center text-[#6b6b80] py-12">No branches yet</p>
        ) : branches?.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(b.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
              <h3 className="font-semibold text-white">{b.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-[#6b6b80]">
                <MapPin className="h-3 w-3" />
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
