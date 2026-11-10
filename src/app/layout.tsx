import type { Metadata, Viewport } from 'next';

import './globals.css';

import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'RotaLucro — controle financeiro de corridas de táxi',
    template: '%s · RotaLucro',
  },
  description:
    'Registre corridas, abastecimentos e veja o lucro de cada dia. Um app mobile-first para taxistas que querem dominar o volante e o caixa.',
  applicationName: 'RotaLucro',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'RotaLucro',
    title: 'RotaLucro — controle financeiro de corridas de táxi',
    description:
      'Corridas, combustível e lucro calculado automaticamente, na palma da mão.',
  },
  twitter: {
    card: 'summary',
    title: 'RotaLucro — controle financeiro de corridas de táxi',
    description:
      'Corridas, combustível e lucro calculado automaticamente, na palma da mão.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a47',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
