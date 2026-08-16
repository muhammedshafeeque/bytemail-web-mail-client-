import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, Sun, Moon, Monitor,
  Shield, Zap, Globe, ChevronRight, Inbox,
} from 'lucide-react';
import { useState } from 'react';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { getStoredTheme, setStoredTheme, ThemeValue } from '@/hooks/useTheme';

const schema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  {
    icon: Zap,
    title: 'Fast by default',
    desc: 'Messages load from the mail store directly — no IMAP round-trips, no waiting.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    desc: 'JWT sessions, rate limiting, and sanitized HTML on every message you open.',
  },
  {
    icon: Globe,
    title: 'Works everywhere',
    desc: 'Installable PWA with offline support, push notifications, and a mobile-first layout.',
  },
];

const THEME_ICONS: Record<ThemeValue, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_CYCLE: ThemeValue[] = ['light', 'dark', 'system'];

function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeValue>(getStoredTheme);

  const handleToggle = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % 3];
    setTheme(next);
    setStoredTheme(next);
  };

  const Icon = THEME_ICONS[theme];

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-stone-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-all duration-200 backdrop-blur-sm shadow-sm"
      title={`Theme: ${theme}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize">{theme}</span>
    </button>
  );
}

function FloatingEnvelope() {
  return (
    <div className="relative flex items-center justify-center h-48 w-48 mx-auto">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-dashed border-teal-400/30"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-4 rounded-full border border-cyan-400/20"
      >
        <motion.div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-teal-400 shadow-lg shadow-teal-400/40" />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-10 rounded-full border border-emerald-400/30"
      >
        <motion.div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/40" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-400 via-brand-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-teal-500/40"
      >
        <Inbox className="h-10 w-10 text-white" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-teal-100/70 mt-0.5">{label}</div>
    </div>
  );
}

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-stone-50 dark:bg-zinc-950 relative overflow-hidden">

      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-800 via-brand-900 to-zinc-950" />

        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="login-orb absolute top-[-80px] left-[-60px] w-[400px] h-[400px] bg-teal-500/30"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="login-orb absolute bottom-[-100px] right-[-80px] w-[500px] h-[500px] bg-cyan-500/20"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="login-orb absolute top-[40%] right-[10%] w-[200px] h-[200px] bg-emerald-400/15"
        />

        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">ByteMail</span>
              <span className="text-teal-200/60 text-sm ml-1.5">repod.online</span>
            </div>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mb-10"
            >
              <FloatingEnvelope />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-3">
                Your mail,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-cyan-200">
                  beautifully
                </span>
                <br />
                organized.
              </h1>
              <p className="text-teal-100/70 text-base leading-relaxed max-w-sm mx-auto">
                The modern email client built for <strong className="text-teal-100">repod.online</strong> —
                fast, secure, and always in sync.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="space-y-4 mb-10"
            >
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="h-4 w-4 text-teal-200" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-teal-100/60 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm"
            >
              <AnimatedStat value="∞" label="Storage" />
              <AnimatedStat value="<50ms" label="Load time" />
              <AnimatedStat value="100%" label="Private" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="flex items-center justify-between text-xs text-teal-100/40 pt-6"
          >
            <span>© {new Date().getFullYear()} Repod · All rights reserved</span>
            <a href="https://repod.online" className="hover:text-teal-100/70 transition-colors flex items-center gap-1">
              repod.online <ChevronRight className="h-3 w-3" />
            </a>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-stone-50 dark:bg-zinc-950 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50 dark:bg-brand-950/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-60" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-50 dark:bg-teal-950/20 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/30">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-stone-900 dark:text-white text-base">ByteMail</span>
              <span className="text-stone-400 text-xs ml-1.5">· repod.online</span>
            </div>
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl shadow-stone-200/60 dark:shadow-black/80 p-8 xl:p-10">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-xs font-medium text-brand-700 dark:text-brand-400 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                  repod.online
                </div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-1.5">
                  Welcome back
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Sign in with your mailbox email or username
                </p>
              </motion.div>

              <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                >
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide mb-2">
                    Email address
                  </label>
                  <div className="relative group">
                    <div className={cn(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
                      focusedField === 'email' ? 'text-brand-500' : 'text-stone-400'
                    )}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      autoComplete="email"
                      placeholder="username@repod.online"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 text-sm rounded-xl border-2 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none transition-all duration-200',
                        errors.email
                          ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20 focus:ring-0'
                          : focusedField === 'email'
                          ? 'border-brand-500 bg-white dark:bg-zinc-900 shadow-[0_0_0_4px_rgba(13,148,136,0.12)]'
                          : 'border-transparent focus:border-brand-400'
                      )}
                    />
                  </div>
                  <AnimatePresence>
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
                      >
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />
                        {errors.email.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32, duration: 0.35 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
                      Password
                    </label>
                  </div>
                  <div className="relative group">
                    <div className={cn(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
                      focusedField === 'password' ? 'text-brand-500' : 'text-stone-400'
                    )}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={cn(
                        'w-full pl-10 pr-11 py-3 text-sm rounded-xl border-2 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none transition-all duration-200',
                        errors.password
                          ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20'
                          : focusedField === 'password'
                          ? 'border-brand-500 bg-white dark:bg-zinc-900 shadow-[0_0_0_4px_rgba(13,148,136,0.12)]'
                          : 'border-transparent'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={showPassword ? 'off' : 'on'}
                          initial={{ opacity: 0, rotate: -10 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: 10 }}
                          transition={{ duration: 0.15 }}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </div>
                  <AnimatePresence>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
                      >
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />
                        {errors.password.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.35 }}
                >
                  <Button
                    type="submit"
                    size="lg"
                    loading={loginMutation.isPending}
                    className="w-full rounded-xl h-12 text-sm font-semibold bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-700 hover:to-teal-600 border-0 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {loginMutation.isPending ? 'Signing in…' : 'Sign in to ByteMail'}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="mt-6 pt-5 border-t border-stone-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
                  <div className="h-7 w-7 rounded-lg bg-brand-100 dark:bg-brand-950 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Use your <span className="font-semibold text-stone-700 dark:text-stone-300">@repod.online</span> email and mail password
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="text-center text-xs text-stone-400 mt-5"
            >
              ByteMail © {new Date().getFullYear()} ·{' '}
              <a href="https://repod.online" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                repod.online
              </a>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
