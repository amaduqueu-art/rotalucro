'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

/**
 * Zera os dados do motorista logado (corridas, abastecimentos e perfil PIX).
 * Ação destrutiva, com confirmação em dois toques.
 */
export function DataResetCard() {
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

      const { error: ridesError } = await supabase
        .from('rides')
        .delete()
        .eq('user_id', user.id);
      if (ridesError) throw ridesError;

      const { error: refuelsError } = await supabase
        .from('fuel_refuels')
        .delete()
        .eq('user_id', user.id);
      if (refuelsError) throw refuelsError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .delete()
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      toast.success('Dados zerados', {
        description: 'Corridas, abastecimentos e perfil PIX foram removidos.',
      });
      setConfirming(false);

      // Recarrega para refletir o estado vazio.
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      toast.error('Não foi possível zerar os dados', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
      setConfirming(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-destructive">
            Zerar todos os dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Remove permanentemente as suas corridas, abastecimentos e a chave PIX
            cadastrada. Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>

      {confirming && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          Tem certeza? Clique novamente para confirmar a exclusão de todos os
          dados.
        </p>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={() => void handleReset()}
        disabled={resetting}
      >
        {resetting ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 aria-hidden="true" />
        )}
        {resetting
          ? 'Zerando...'
          : confirming
            ? 'Confirmar exclusão de tudo'
            : 'Zerar todos os dados'}
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
