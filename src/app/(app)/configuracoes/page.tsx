import type { Metadata } from 'next';

import { DataResetCard } from '@/components/data-reset-card';
import { DriverPixForm } from '@/components/driver-pix-form';
import { EmailChangeCard } from '@/components/email-change-card';
import { PixResetCard } from '@/components/pix-reset-card';

export const metadata: Metadata = {
  title: 'Configurações',
};

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre sua chave PIX uma vez. O QR Code de cada corrida usará os
          dados desta conta — perfeito quando o app é distribuído para vários
          taxistas.
        </p>
      </header>
      <DriverPixForm />

      <EmailChangeCard />

      <PixResetCard />

      <DataResetCard />
    </div>
  );
}
