'use client';

import { Loader2, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

/**
 * Solicita a alteração do e-mail da conta logada. O Supabase envia um link de
 * confirmação para o novo endereço; a troca só ocorre após a confirmação.
 */
export function EmailChangeCard() {
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        email: value,
      });
      if (updateError) throw updateError;

      toast.success('Confirmação enviada', {
        description:
          'Um link foi enviado para o novo e-mail. A troca ocorre após a confirmação.',
      });
      setNewEmail('');
    } catch (updateError) {
      toast.error('Não foi possível solicitar a troca de e-mail', {
        description: getErrorMessage(updateError, 'Tente novamente em instantes.'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start gap-2">
        <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight">
            Alterar e-mail da conta
          </h2>
          <p className="text-sm text-muted-foreground">
            Informe o novo e-mail. O Supabase enviará um link de confirmação para
            esse endereço; a troca só ocorre após você clicar no link.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="new-email">Novo e-mail</Label>
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setError(null);
            }}
            placeholder="novo@email.com"
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="field-error">{error}</p> : null}
        </div>

        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Mail aria-hidden="true" />
          )}
          {saving ? 'Enviando...' : 'Solicitar troca de e-mail'}
        </Button>
      </form>
    </div>
  );
}
