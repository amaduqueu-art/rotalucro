import type { Metadata, Viewport } from 'next';

import './globals.css';

import { Providers } from '@/components/providers';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — gestão financeira de corridas de táxi`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    'Registre corridas, abastecimentos e veja o lucro líquido de cada dia. Um app mobile-first para taxistas que querem dominar o volante e o caixa.',
  applicationName: BRAND.name,
  authors: [{ name: BRAND.owner }],
  creator: BRAND.owner,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: BRAND.name,
    title: `${BRAND.name} — gestão financeira de corridas de táxi`,
    description:
      'Corridas por voz, combustível calculado, PIX e lucro na palma da mão.',
  },
  twitter: {
    card: 'summary',
    title: `${BRAND.name} — gestão financeira de corridas de táxi`,
    description:
      'Corridas por voz, combustível calculado, PIX e lucro na palma da mão.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a47',
};

/** Aplica o tema salvo antes da primeira pintura (evita flash). */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('rrcl-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
