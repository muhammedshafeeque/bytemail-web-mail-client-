import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Login } from '@/pages/Login';
import { Mail } from '@/pages/Mail';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminDomains } from '@/pages/admin/AdminDomains';
import { AdminDkim } from '@/pages/admin/AdminDkim';
import { AdminAliases } from '@/pages/admin/AdminAliases';
import { useMe } from '@/hooks/useAuth';
import { userIsAdmin } from '@/utils/admin';
import { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const { isLoading } = useMe();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user && isLoading) return null;
  if (!userIsAdmin(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  useTheme();
  useMe();
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800',
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '380px',
          },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Mail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<AdminRoute><AdminDashboard /></AdminRoute>}
        />
        <Route
          path="/admin/users"
          element={<AdminRoute><AdminUsers /></AdminRoute>}
        />
        <Route
          path="/admin/domains"
          element={<AdminRoute><AdminDomains /></AdminRoute>}
        />
        <Route
          path="/admin/dkim"
          element={<AdminRoute><AdminDkim /></AdminRoute>}
        />
        <Route
          path="/admin/aliases"
          element={<AdminRoute><AdminAliases /></AdminRoute>}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}
