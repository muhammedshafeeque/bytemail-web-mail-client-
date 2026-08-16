import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoginPayload, TwoFactorChallenge } from '@/types/user';

export function isTwoFactorChallenge(data: unknown): data is TwoFactorChallenge {
  return Boolean(data && typeof data === 'object' && (data as TwoFactorChallenge).requires_2fa);
}

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await authApi.login(payload);
      return data.data;
    },
    onSuccess: (data) => {
      if (isTwoFactorChallenge(data)) return;
      login(data.user, data.accessToken);
      navigate('/');
      toast.success('Welcome back!');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Login failed');
    },
  });
}

export function useLoginTwoFactor() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: { ticket: string; code: string }) => {
      const { data } = await authApi.loginTwoFactor(payload);
      return data.data;
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken);
      navigate('/');
      toast.success('Welcome back!');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Invalid authenticator code');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useMe() {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await authApi.me();
      setUser(data.data);
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
