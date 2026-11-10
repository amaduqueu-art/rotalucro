'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;

      router.replace('/entrar');
      router.refresh();
    } catch (error) {
      toast.error('Não foi possível sair', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut aria-hidden="true" />
      )}
      Sair
    </Button>
  );
}
