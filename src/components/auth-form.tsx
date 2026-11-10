'use client';

import { Eye, EyeOff, Loader2, Lock, LogIn, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { cn, getErrorMessage } from '@/lib/utils';

type Mode = 'signin' | 'signup';

type FieldErrors = Partial<Record<'email' | 'password' | 'confirm', string>>;

const AUTH_ERROR_TRANSLATIONS: ReadonlyArray<{ match: string; message: string }> =
  [
    {
      match: 'invalid login credentials',
      message: 'E-mail ou senha incorretos.',
    },
    {
      match: 'email not confirmed',
      message:
        'Confirme seu e-mail antes de entrar (procure na caixa de entrada e no spam).',
    },
    {
      match: 'user already registered',
      message: 'Este e-mail já possui conta. Faça login com sua senha.',
    },
    {
      match: 'password should be at least 6 characters',
      message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    },
    {
      match: 'email address is invalid',
      message: 'Informe um e-mail válido.',
    },
    {
      match: 'over_email_send_rate_limit',
      message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    },
  ];

function translateAuthMessage(message: string): string {
  const normalized = message.toLowerCase();
  const found = AUTH_ERROR_TRANSLATIONS.find((item) =>
    normalized.includes(item.match),
  );
  return found?.message ?? message;
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(field: keyof FieldErrors) {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function switchMode(nextMode: Mode) {
    if (submitting || nextMode === mode) return;
    setMode(nextMode);
    setErrors({});
    setFormError(null);
    setNotice(null);
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Informe um e-mail válido.';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (mode === 'signup' && confirm !== password) {
      nextErrors.confirm = 'As senhas não coincidem.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setNotice(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const supabase = createClient();
      const trimmedEmail = email.trim();

      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) throw error;
        if (!data.session) {
          throw new Error('Não foi possível iniciar sua sessão. Tente de novo.');
        }

        toast.success('Bem-vindo de volta!');
        router.replace('/');
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) throw error;

      if (data.session) {
        // Projeto com confirmação de e-mail desativada.
        toast.success('Conta criada!', {
          description: 'Boa estrada — comece registrando sua primeira corrida.',
        });
        router.replace('/');
        router.refresh();
        return;
      }

      setNotice(
        'Conta criada! Confirme seu e-mail (veja também o spam) e depois faça login.',
      );
      setMode('signin');
      setConfirm('');
    } catch (error) {
      const message = translateAuthMessage(
        getErrorMessage(error, 'Não foi possível concluir. Tente novamente.'),
      );
      setFormError(message);
      toast.error(
        mode === 'signin' ? 'Não foi possível entrar' : 'Não foi possível criar a conta',
        { description: message },
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrors((previous) => ({
        ...previous,
        email: 'Informe seu e-mail acima para recuperar a senha.',
      }));
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) throw error;
      toast.success('E-mail de recuperação enviado', {
        description: 'Verifique sua caixa de entrada (e o spam).',
      });
    } catch (error) {
      toast.error('Não foi possível enviar o e-mail', {
        description: translateAuthMessage(
          getErrorMessage(error, 'Tente novamente em instantes.'),
        ),
      });
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <div
        role="tablist"
        aria-label="Escolha entrar ou criar conta"
        className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1"
      >
        {(
          [
            { value: 'signin', label: 'Entrar' },
            { value: 'signup', label: 'Criar conta' },
          ] as const
        ).map((tab) => {
          const active = mode === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(tab.value)}
              className={cn(
                'flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.value === 'signin' ? (
                <LogIn className="size-4" aria-hidden="true" />
              ) : (
                <UserRound className="size-4" aria-hidden="true" />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-red-950"
        >
          {formError}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"
        >
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(errors.email && 'border-destructive')}
          />
          {errors.email ? (
            <p id="email-error" className="field-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Sua senha"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError('password');
              }}
              aria-required="true"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={cn('pr-12', errors.password && 'border-destructive')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p id="password-error" className="field-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        {mode === 'signup' ? (
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                clearError('confirm');
              }}
              aria-required="true"
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? 'confirm-error' : undefined}
              className={cn(errors.confirm && 'border-destructive')}
            />
            {errors.confirm ? (
              <p id="confirm-error" className="field-error">
                {errors.confirm}
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : mode === 'signin' ? (
            <LogIn aria-hidden="true" />
          ) : (
            <UserRound aria-hidden="true" />
          )}
          {submitting
            ? 'Aguarde...'
            : mode === 'signin'
              ? 'Entrar'
              : 'Criar conta'}
        </Button>

        {mode === 'signin' ? (
          <button
            type="button"
            onClick={handleResetPassword}
            className="block w-full min-h-[44px] text-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Esqueci minha senha
          </button>
        ) : null}
      </form>

      <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Acesso individual: cada motorista vê apenas as próprias corridas
        (Row Level Security).
      </p>
    </div>
  );
}
