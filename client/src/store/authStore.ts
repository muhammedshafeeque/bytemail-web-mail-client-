import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { userIsAdmin } from '@/utils/admin';

function withAdminFlag(user: User): User {
  const isAdmin = userIsAdmin(user);
  return {
    ...user,
    is_admin: isAdmin,
    role: isAdmin ? 'admin' : (user.role || 'user'),
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user: withAdminFlag(user) }),
      setAccessToken: (token) => set({ accessToken: token }),

      login: (user, token) =>
        set({ user: withAdminFlag(user), accessToken: token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? withAdminFlag({ ...state.user, ...updates }) : null,
        })),
    }),
    {
      name: 'bytemail-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) state.setUser(state.user);
      },
    }
  )
);
