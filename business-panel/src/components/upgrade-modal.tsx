'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useLocaleStore } from '@/lib/locale-store';
import type { Plan } from '@/lib/use-plan';

const PLAN_FEATURES: Record<Exclude<Plan, 'FREE'>, string[]> = {
  STARTER: [
    'Up to 5 active campaigns',
    'Snake 🐍, Point Guess 🔢, Weighted Odds campaigns',
    'Campaign duplication',
    'Financial analytics — revenue, reward cost, ROI',
  ],
  GROWTH: [
    'Up to 20 active campaigns',
    'Full activity audit log',
    'Everything in Starter',
  ],
  ENTERPRISE: [
    'Unlimited active campaigns',
    'Everything in Growth',
  ],
};

const PLAN_PRICE: Record<Exclude<Plan, 'FREE'>, string> = {
  STARTER: '₪149/mo',
  GROWTH: '₪299/mo',
  ENTERPRISE: '₪799/mo',
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan: Exclude<Plan, 'FREE'>;
  featureName: string;
}

export function UpgradeModal({ open, onClose, requiredPlan, featureName }: UpgradeModalProps) {
  const t = useLocaleStore((s) => s.t);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
          <div className="bg-[#13131a] border border-amber-500/30 rounded-2xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <Dialog.Title className="text-white font-bold text-base">
                    {t('upgrade_required')}
                  </Dialog.Title>
                  <Dialog.Description className="text-[#6b6b80] text-xs mt-0.5">
                    {t('upgrade_feature_locked').replace('{feature}', featureName).replace('{plan}', requiredPlan)}
                  </Dialog.Description>
                </div>
              </div>
              <button onClick={onClose} className="text-[#6b6b80] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Plan name + price */}
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold text-sm">{requiredPlan} {t('upgrade_plan')}</span>
                <span className="text-white font-bold">{PLAN_PRICE[requiredPlan]}</span>
              </div>
            </div>

            {/* Feature list */}
            <ul className="space-y-2 mb-6">
              {PLAN_FEATURES[requiredPlan].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#a1a1b5]">
                  <span className="text-amber-400 shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex gap-3">
              <Link
                href="/billing"
                onClick={onClose}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg text-center transition-colors"
              >
                {t('billing_upgrade_cta')}
              </Link>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#1e1e2e] hover:bg-[#2a2a38] border border-[#2a2a38] text-[#a1a1b5] text-sm font-medium rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
