import { cn } from '@/utils/cn';

interface BadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export function Badge({ count, className, max = 99 }: BadgeProps) {
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-brand-600 text-white leading-none',
        className
      )}
    >
      {display}
    </span>
  );
}
