import { EmailAddress } from '@/types/email';
import { Avatar } from '@/components/ui/Avatar';

interface EmailAvatarProps {
  from: EmailAddress;
  size?: 'sm' | 'md' | 'lg';
}

export function EmailAvatar({ from, size = 'md' }: EmailAvatarProps) {
  return <Avatar name={from.name || from.email} email={from.email} size={size} />;
}
