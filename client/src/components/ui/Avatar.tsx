import { cn } from '@/utils/cn';
import { getInitials, getAvatarColor } from '@/utils/avatarColor';

interface AvatarProps {
  name: string;
  email?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

export function Avatar({ name, email, color, size = 'md', className }: AvatarProps) {
  const bg = color ?? getAvatarColor(email ?? name);
  const initials = getInitials(name, email);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bg }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
