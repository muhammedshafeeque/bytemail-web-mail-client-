import { User } from '@/types/user';

function bootstrapAdminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  return (raw || 'superadmin@repod.online')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function userIsAdmin(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.is_admin === true) return true;
  if (user.role === 'admin') return true;
  return bootstrapAdminEmails().includes(user.email.trim().toLowerCase());
}
