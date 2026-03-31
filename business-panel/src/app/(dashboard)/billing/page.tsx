'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Check, ExternalLink, Download, Zap, Crown, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Subscription {
  id: string;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  isActive: boolean;
  startsAt: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  invoices: Invoice[];
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

const PLAN_ORDER = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

function BillingContent() {
  const { businessId } = useAuthStore();
  const t = useLocaleStore((s) => s.t);

  const PLANS = [
    {
      key: 'FREE',
      name: t('plan_free_name'),
      price: 0,
      campaigns: 3,
      features: [
        t('plan_free_f1'),
        t('plan_free_f2'),
        t('plan_free_f3'),
        t('plan_free_f4'),
        t('plan_free_f5'),
        t('plan_free_f6'),
      ],
      locked: [
        t('plan_feat_advanced_types'),
        t('plan_feat_financials'),
        t('plan_feat_duplication'),
      ],
      cta: null as string | null,
    },
    {
      key: 'STARTER',
      name: t('plan_starter_name'),
      price: 149,
      campaigns: 10,
      features: [
        t('plan_starter_f1'),
        t('plan_starter_f3'),
        t('plan_starter_f4'),
        t('plan_feat_everything_free'),
      ],
      locked: [t('plan_feat_advanced_types')],
      cta: t('plan_starter_cta'),
      highlight: false,
    },
    {
      key: 'GROWTH',
      name: t('plan_growth_name'),
      price: 299,
      campaigns: 20,
      features: [
        t('plan_growth_f1'),
        t('plan_feat_advanced_types'),
        t('plan_feat_everything_starter'),
      ],
      locked: [] as string[],
      cta: t('plan_growth_cta'),
      highlight: true,
    },
    {
      key: 'ENTERPRISE',
      name: t('plan_enterprise_name'),
      price: 799,
      campaigns: -1,
      features: [
        t('plan_enterprise_f1'),
        t('plan_feat_everything_growth'),
      ],
      locked: [] as string[],
      cta: t('plan_enterprise_cta'),
      highlight: false,
    },
  ];
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{ key: string; price: number; isUpgrade: boolean } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast(t('billing_updated'), 'success');
    } else if (searchParams.get('cancelled') === 'true') {
      showToast(t('billing_cancelled'), 'error');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!businessId) return;
    api
      .get(`/billing/subscription?businessId=${businessId}`)
      .then((r) => setSub(r.data))
      .catch(() => showToast(t('billing_load_failed'), 'error'))
      .finally(() => setLoading(false));
  }, [businessId]);

  const parseApiError = (err: any): string => {
    const msg = err?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg || err?.message || t('billing_error');
  };

  const requestChangePlan = (planKey: string, planPrice: number, isUpgrade: boolean) => {
    setConfirmPlan({ key: planKey, price: planPrice, isUpgrade });
  };

  const handleChangePlan = async () => {
    if (!businessId || !confirmPlan) return;
    const plan = confirmPlan.key;
    setConfirmPlan(null);
    setUpgrading(plan);
    try {
      const { data } = await api.post(`/billing/checkout?businessId=${businessId}`, { plan });
      if (data.redirect) {
        window.location.href = data.url;
      } else {
        const updated = await api.get(`/billing/subscription?businessId=${businessId}`);
        setSub(updated.data);
        showToast(t('billing_plan_changed'), 'success');
        setUpgrading(null);
      }
    } catch (err: any) {
      showToast(parseApiError(err), 'error');
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    if (!businessId) return;
    try {
      const { data } = await api.post(`/billing/portal?businessId=${businessId}`);
      window.open(data.url, '_blank');
    } catch (err: any) {
      showToast(parseApiError(err), 'error');
    }
  };

  const currentPlanIndex = PLAN_ORDER.indexOf(sub?.plan ?? 'FREE');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm plan change dialog */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#13131a] border border-[#2a2a38] rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${confirmPlan.isUpgrade ? 'bg-amber-500/15' : 'bg-red-500/10'}`}>
                <AlertTriangle className={`h-5 w-5 ${confirmPlan.isUpgrade ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
              <h3 className="text-white font-bold text-base">{t('billing_confirm_title')}</h3>
            </div>
            <p className="text-[#a1a1b5] text-sm mb-6 leading-relaxed">
              {confirmPlan.key === 'FREE'
                ? t('billing_confirm_free_body')
                : confirmPlan.isUpgrade
                ? t('billing_confirm_upgrade_body').replace('{price}', `₪${confirmPlan.price}`)
                : t('billing_confirm_downgrade_body').replace('{price}', `₪${confirmPlan.price}`)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleChangePlan}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
                  confirmPlan.isUpgrade
                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                    : 'bg-red-500/80 hover:bg-red-500 text-white'
                }`}
              >
                {t('billing_confirm_cta')}
              </button>
              <button
                onClick={() => setConfirmPlan(null)}
                className="flex-1 py-2.5 bg-[#1e1e2e] hover:bg-[#2a2a38] border border-[#2a2a38] text-[#a1a1b5] text-sm font-medium rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('billing_title')}</h1>
          <p className="text-[#6b6b80] text-sm mt-1">{t('billing_subtitle')}</p>
        </div>
        {sub?.stripeSubscriptionId && (
          <button
            onClick={handleManage}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e1e2e] border border-[#2a2a38] text-[#a1a1b5] rounded-lg hover:text-white hover:border-[#3a3a4e] transition-colors text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            {t('billing_manage')}
          </button>
        )}
      </div>

      {/* Current Plan */}
      {sub && (
        <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-[#6b6b80] uppercase tracking-wider font-medium">{t('billing_current_plan')}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-white">{sub.plan}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.isActive
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {sub.isActive ? t('billing_active') : t('inactive')}
                </span>
              </div>
            </div>
          </div>
          {sub.currentPeriodEnd && (
            <p className="text-sm text-[#6b6b80]">
              {t('billing_renews')} <span className="text-white">{formatDate(sub.currentPeriodEnd)}</span>
            </p>
          )}
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('billing_plans')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.key;
            const isDowngrade = PLAN_ORDER.indexOf(plan.key) < currentPlanIndex;
            const isHighlight = plan.key === 'GROWTH';

            return (
              <div
                key={plan.key}
                className={`relative rounded-xl border p-5 flex flex-col ${
                  isHighlight
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : isCurrent
                    ? 'border-[#3a3a4e] bg-[#1e1e2e]'
                    : 'border-[#2a2a38] bg-[#1a1a24]'
                }`}
              >
                {isHighlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 bg-amber-500 text-black text-xs font-bold px-2.5 py-0.5 rounded-full">
                      <Crown className="h-3 w-3" />
                      {t('billing_popular')}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    {plan.key === 'ENTERPRISE' && <Zap className="h-4 w-4 text-amber-400" />}
                    <span className="font-semibold text-white">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">
                      {plan.price === 0 ? t('billing_free_price') : `₪${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-xs text-[#6b6b80]">{t('billing_per_month')}</span>}
                  </div>
                </div>

                <ul className="space-y-2 mb-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#a1a1b5]">
                      <Check className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {'locked' in plan && plan.locked.length > 0 && plan.locked.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#3a3a4e]">
                      <span className="mt-0.5 shrink-0 text-[#3a3a4e]">✕</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm font-medium text-[#6b6b80] py-2 border border-[#2a2a38] rounded-lg">
                    {t('billing_current')}
                  </div>
                ) : (
                  <button
                    onClick={() => requestChangePlan(plan.key, plan.price, !isDowngrade && plan.key !== 'FREE')}
                    disabled={upgrading === plan.key}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isHighlight
                        ? 'bg-amber-500 text-black hover:bg-amber-400'
                        : isDowngrade || plan.key === 'FREE'
                        ? 'bg-[#1e1e2e] text-[#a1a1b5] hover:bg-[#2a2a38] border border-[#2a2a38]'
                        : 'bg-[#2a2a38] text-white hover:bg-[#3a3a4e]'
                    } disabled:opacity-50`}
                  >
                    {upgrading === plan.key
                      ? t('billing_loading')
                      : isDowngrade || plan.key === 'FREE'
                      ? plan.key === 'FREE' ? t('billing_downgrade_to_free') : t('billing_downgrade_cta')
                      : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      {sub && sub.invoices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">{t('billing_invoices')}</h2>
          <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a38]">
                  <th className="text-left px-5 py-3 text-xs text-[#6b6b80] font-medium uppercase tracking-wider">
                    {t('billing_date')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs text-[#6b6b80] font-medium uppercase tracking-wider">
                    {t('billing_amount')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs text-[#6b6b80] font-medium uppercase tracking-wider">
                    {t('billing_status')}
                  </th>
                  <th className="text-right px-5 py-3 text-xs text-[#6b6b80] font-medium uppercase tracking-wider">
                    {t('billing_invoice')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a38]">
                {sub.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#1e1e2e] transition-colors">
                    <td className="px-5 py-3.5 text-[#a1a1b5]">{formatDate(inv.createdAt)}</td>
                    <td className="px-5 py-3.5 text-white font-medium">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inv.paidAt
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}
                      >
                        {inv.paidAt ? t('billing_paid') : t('billing_pending')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.invoiceUrl ? (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t('billing_download')}
                        </a>
                      ) : (
                        <span className="text-[#6b6b80]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub && sub.invoices.length === 0 && (
        <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-xl p-8 text-center">
          <CreditCard className="h-8 w-8 text-[#3a3a4e] mx-auto mb-3" />
          <p className="text-[#6b6b80] text-sm">{t('billing_no_invoices')}</p>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}
