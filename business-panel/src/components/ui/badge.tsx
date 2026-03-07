import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-amber-500/20 text-amber-400',
        secondary: 'bg-[#2a2a38] text-[#a1a1b5]',
        active: 'bg-green-500/20 text-green-400',
        paused: 'bg-yellow-500/20 text-yellow-400',
        ended: 'bg-[#2a2a38] text-[#6b6b80]',
        destructive: 'bg-red-500/20 text-red-400',
        draft: 'bg-blue-500/20 text-blue-400',
        scheduled: 'bg-purple-500/20 text-purple-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
