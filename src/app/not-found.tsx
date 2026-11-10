import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="container flex flex-1 flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-extrabold">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        A corrida que você procura não existe ou pertence a outra conta.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: 'accent' }), 'mt-6')}
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
