'use client';

import { AlertTriangle, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

/**
 * Redefine (apaga) a chave PIX cadastrada pelo motorista logado.
 * Ação com confirmação em dois toques.
 */
export function PixResetCard() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setResetting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Sua sessão expirou. Entre novamente.');
      }

      const { error } = await supabase
        .from('driver_profiles')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;

      toast.success('Chave PIX redefinida', {
        description: 'Cadastre uma nova chave em Configurações quando quiser.',
      });
      setConfirming(false);

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toast.error('Não foi possível redefinir a chave PIX', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
      setConfirming(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/60 p-5 dark:border-amber-700/60 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <KeyRound
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-amber-900 dark:text-amber-100">
            Redefinir chave PIX
          </h2>
          <p className="text-sm text-muted-foreground">
            Apaga a chave PIX cadastrada nesta conta. Você poderá cadastrar uma
            nova em seguida. Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>

      {confirming && (
        <p className="rounded-lg border border-amber-400 bg-amber-100 p-3 text-sm font-semibold text-amber-950 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100">
          Tem certeza? Clique novamente para confirmar a redefinição da chave
          PIX.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => void handleReset()}
        disabled={resetting}
        className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/40"
      >
        {resetting ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 aria-hidden="true" />
        )}
        {resetting
          ? 'Redefinindo...'
          : confirming
            ? 'Confirmar redefinição'
            : 'Redefinir chave PIX'}
      </Button>

      {confirming && !resetting && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}
