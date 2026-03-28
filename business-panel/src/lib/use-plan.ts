import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useAuthStore } from './auth-store';

export type Plan = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

const PLAN_ORDER: Plan[] = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

export function usePlan(): Plan {
  const businessId = useAuthStore((s) => s.businessId);
  const { data } = useQuery({
    queryKey: ['subscription', businessId],
    queryFn: () => api.get(`/billing/subscription?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
    staleTime: 5 * 60_000,
  });
  return (data?.plan as Plan) ?? 'FREE';
}

export function planAtLeast(current: Plan, required: Plan): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}
