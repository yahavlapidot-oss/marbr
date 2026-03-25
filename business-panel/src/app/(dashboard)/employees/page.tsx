'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, UserCircle2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';

const ROLES = ['MANAGER', 'STAFF', 'BARTENDER'];

const roleBadge: Record<string, string> = {
  OWNER: 'bg-amber-500/20 text-amber-400',
  MANAGER: 'bg-blue-500/20 text-blue-400',
  STAFF: 'bg-green-500/20 text-green-400',
  BARTENDER: 'bg-purple-500/20 text-purple-400',
};

export default function EmployeesPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ email: string; role: string; branchId?: string }>();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', businessId],
    queryFn: () => api.get(`/employees?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const invite = useMutation({
    mutationFn: (data: any) => api.post(`/employees?businessId=${businessId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); reset(); },
    onError: (err: any) => alert(err?.response?.data?.message ?? t('employee_invite_failed')),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? t('employee_revoke_failed')),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('employees_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('employees_subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t('employees_invite')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t('employees_invite')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => invite.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>{t('employees_email')}</Label>
                <Input placeholder="employee@email.com" {...register('email', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('employees_role')}</Label>
                <select
                  {...register('role', { required: true })}
                  className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
                >
                  <option value="">{t('employees_role_select')}</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('employees_branch')}</Label>
                <select
                  {...register('branchId')}
                  className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
                >
                  <option value="">{t('employees_all_branches')}</option>
                  {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {invite.isPending ? t('employees_sending') : t('employees_send_invite')}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
            <div className="divide-y divide-[#2a2a38]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
            </div>
          ) : employees?.length === 0 ? (
            <p className="text-center text-[#6b6b80] py-12">{t('employees_empty')}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b6b80]">
                  <th className="text-left px-4 py-3">{t('employees_col_employee')}</th>
                  <th className="text-left px-4 py-3">{t('employees_col_role')}</th>
                  <th className="text-left px-4 py-3">{t('employees_col_branch')}</th>
                  <th className="text-left px-4 py-3">{t('employees_col_status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {employees?.map((e: any) => (
                  <tr key={e.id} className="border-b border-[#2a2a3a] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5 text-[#6b6b80]" />
                        <div>
                          <p className="text-white font-medium">{e.user?.fullName ?? e.user?.email}</p>
                          <p className="text-[#6b6b80] text-xs">{e.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[e.role] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b6b80]">{e.branch?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {e.isActive ? t('active') : t('employee_revoked')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.role !== 'OWNER' && (
                        <Button variant="ghost" size="icon" onClick={() => revoke.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
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
